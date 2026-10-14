using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DotNetArchaeologist.Core.Domain;
using Microsoft.Extensions.Options;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Implementazione thread-safe in memoria di IAssemblySessionStore con supporto a Time-To-Live (TTL),
/// rinnovo per inattività (sliding expiration) e politica di espulsione LRU al raggiungimento dei limiti di capacità.
/// </summary>
public sealed class InMemoryAssemblySessionStore : IAssemblySessionStore
{
    private sealed class SessionRecord
    {
        public required string SessionId { get; init; }
        public required AssemblyDescriptor Descriptor { get; init; }
        public required byte[] RawBytes { get; init; }
        public required DateTimeOffset CreatedAt { get; init; }
        public DateTimeOffset LastAccessedAt { get; set; }
        public long SizeBytes => RawBytes.Length;
        public Dictionary<string, string> DecompileCache { get; } = new(StringComparer.Ordinal);
    }

    private readonly object _syncLock = new();
    private readonly Dictionary<string, SessionRecord> _sessions = new(StringComparer.Ordinal);
    private long _totalStoredBytes;
    private readonly AssemblySessionOptions _options;
    private readonly TimeProvider _timeProvider;

    public InMemoryAssemblySessionStore(
        IOptions<AssemblySessionOptions>? options = null,
        TimeProvider? timeProvider = null)
    {
        _options = options?.Value ?? new AssemblySessionOptions();
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>
    /// Numero di sessioni attualmente conservate e attive in memoria.
    /// </summary>
    public int ActiveSessionsCount
    {
        get
        {
            lock (_syncLock)
            {
                PurgeExpiredInternal(_timeProvider.GetUtcNow());
                return _sessions.Count;
            }
        }
    }

    /// <summary>
    /// Dimensione totale aggregata in byte degli assembly attualmente memorizzati.
    /// Accesso immediato O(1) senza allocazioni né scansioni.
    /// </summary>
    public long TotalStoredBytes
    {
        get
        {
            lock (_syncLock)
            {
                PurgeExpiredInternal(_timeProvider.GetUtcNow());
                return _totalStoredBytes;
            }
        }
    }

    public string Register(AssemblyDescriptor descriptor, byte[] rawBytes)
    {
        ArgumentNullException.ThrowIfNull(descriptor);
        ArgumentNullException.ThrowIfNull(rawBytes);

        var now = _timeProvider.GetUtcNow();
        var sessionId = Guid.NewGuid().ToString("N");

        lock (_syncLock)
        {
            // 1. Rimuovi prima eventuali sessioni scadute
            PurgeExpiredInternal(now);

            // 2. Se abbiamo raggiunto il numero massimo di sessioni, espelli le meno recentemente utilizzate (LRU)
            while (_sessions.Count >= _options.MaxConcurrentSessions && _sessions.Count > 0)
            {
                EvictLeastRecentlyUsed();
            }

            // 3. Se la dimensione aggregata supera il limite consentito, espelli in O(1) finché non c'è spazio
            while (_sessions.Count > 0 && (_totalStoredBytes + rawBytes.Length > _options.MaxTotalBytes))
            {
                EvictLeastRecentlyUsed();
            }

            var record = new SessionRecord
            {
                SessionId = sessionId,
                Descriptor = descriptor,
                RawBytes = rawBytes,
                CreatedAt = now,
                LastAccessedAt = now
            };

            _sessions[sessionId] = record;
            _totalStoredBytes += rawBytes.Length;
        }

        return sessionId;
    }

    public AssemblyDescriptor? GetDescriptor(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return null;
        }

        var now = _timeProvider.GetUtcNow();

        lock (_syncLock)
        {
            if (!_sessions.TryGetValue(sessionId, out var record))
            {
                return null;
            }

            if (IsExpired(record, now))
            {
                RemoveSessionInternal(sessionId, record);
                return null;
            }

            if (_options.SlidingExpiration)
            {
                record.LastAccessedAt = now;
            }

            return record.Descriptor;
        }
    }

    public Stream? GetStream(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return null;
        }

        var now = _timeProvider.GetUtcNow();

        lock (_syncLock)
        {
            if (!_sessions.TryGetValue(sessionId, out var record))
            {
                return null;
            }

            if (IsExpired(record, now))
            {
                RemoveSessionInternal(sessionId, record);
                return null;
            }

            if (_options.SlidingExpiration)
            {
                record.LastAccessedAt = now;
            }

            return new MemoryStream(record.RawBytes, writable: false);
        }
    }

    public string? GetCachedDecompilation(string sessionId, string cacheKey)
    {
        if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(cacheKey))
        {
            return null;
        }

        lock (_syncLock)
        {
            if (_sessions.TryGetValue(sessionId, out var record))
            {
                if (record.DecompileCache.TryGetValue(cacheKey, out var code))
                {
                    return code;
                }
            }

            return null;
        }
    }

    public void CacheDecompilation(string sessionId, string cacheKey, string code)
    {
        if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(cacheKey) || code == null)
        {
            return;
        }

        lock (_syncLock)
        {
            if (_sessions.TryGetValue(sessionId, out var record))
            {
                // Limite massimo di 250 elementi decompilati in cache per sessione per preservare la RAM
                if (record.DecompileCache.Count > 250)
                {
                    record.DecompileCache.Clear();
                }

                record.DecompileCache[cacheKey] = code;
            }
        }
    }

    /// <summary>
    /// Esegue la pulizia esplicita di tutte le sessioni scadute.
    /// Restituisce il numero di sessioni rimosse.
    /// </summary>
    public int PurgeExpired()
    {
        lock (_syncLock)
        {
            return PurgeExpiredInternal(_timeProvider.GetUtcNow());
        }
    }

    private int PurgeExpiredInternal(DateTimeOffset now)
    {
        var expiredList = new List<SessionRecord>();
        foreach (var session in _sessions.Values)
        {
            if (IsExpired(session, now))
            {
                expiredList.Add(session);
            }
        }

        foreach (var record in expiredList)
        {
            RemoveSessionInternal(record.SessionId, record);
        }

        return expiredList.Count;
    }

    private void RemoveSessionInternal(string sessionId, SessionRecord record)
    {
        if (_sessions.Remove(sessionId))
        {
            _totalStoredBytes = Math.Max(0, _totalStoredBytes - record.SizeBytes);
        }
    }

    private bool IsExpired(SessionRecord record, DateTimeOffset now)
    {
        return now - record.LastAccessedAt > _options.SessionTimeout;
    }

    private void EvictLeastRecentlyUsed()
    {
        SessionRecord? oldest = null;
        foreach (var record in _sessions.Values)
        {
            if (oldest == null || record.LastAccessedAt < oldest.LastAccessedAt)
            {
                oldest = record;
            }
        }

        if (oldest != null)
        {
            RemoveSessionInternal(oldest.SessionId, oldest);
        }
    }
}
