using System;
using System.Collections.Concurrent;
using System.IO;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Implementazione thread-safe in memoria di IAssemblySessionStore.
/// Conserva i metadati e i byte degli assembly aperti per la durata della sessione locale.
/// </summary>
public sealed class InMemoryAssemblySessionStore : IAssemblySessionStore
{
    private sealed record SessionRecord(AssemblyDescriptor Descriptor, byte[] RawBytes);

    private readonly ConcurrentDictionary<string, SessionRecord> _sessions = new(StringComparer.Ordinal);

    public string Register(AssemblyDescriptor descriptor, byte[] rawBytes)
    {
        ArgumentNullException.ThrowIfNull(descriptor);
        ArgumentNullException.ThrowIfNull(rawBytes);

        var sessionId = Guid.NewGuid().ToString("N");
        _sessions[sessionId] = new SessionRecord(descriptor, rawBytes);
        return sessionId;
    }

    public AssemblyDescriptor? GetDescriptor(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return null;
        }

        return _sessions.TryGetValue(sessionId, out var record) ? record.Descriptor : null;
    }

    public Stream? GetStream(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return null;
        }

        return _sessions.TryGetValue(sessionId, out var record)
            ? new MemoryStream(record.RawBytes, writable: false)
            : null;
    }
}
