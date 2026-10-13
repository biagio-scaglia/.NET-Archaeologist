using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DotNetArchaeologist.Api.Services;
using DotNetArchaeologist.Core.Domain;
using Microsoft.Extensions.Options;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class AssemblySessionStoreTests
{
    private sealed class ManualTestTimeProvider : TimeProvider
    {
        public DateTimeOffset Current { get; set; } = new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Current;
        public void Advance(TimeSpan delta) => Current = Current.Add(delta);
    }

    private static AssemblyDescriptor CreateDummyDescriptor(string name)
    {
        return new AssemblyDescriptor(
            Name: name,
            Version: new Version(1, 0, 0, 0),
            Culture: null,
            PublicKeyToken: null,
            TargetFramework: ".NET 8.0",
            Mvid: Guid.NewGuid(),
            References: [],
            Types: []);
    }

    [Fact]
    public void Register_StoresSessionAndReturnsValidGuid()
    {
        var store = new InMemoryAssemblySessionStore();
        var descriptor = CreateDummyDescriptor("TestModule");
        var rawBytes = new byte[] { 0x4D, 0x5A, 0x90, 0x00 };

        var sessionId = store.Register(descriptor, rawBytes);

        Assert.False(string.IsNullOrWhiteSpace(sessionId));
        Assert.Equal(1, store.ActiveSessionsCount);
        Assert.Equal(4, store.TotalStoredBytes);

        var retrieved = store.GetDescriptor(sessionId);
        Assert.NotNull(retrieved);
        Assert.Equal("TestModule", retrieved.Name);

        using var stream = store.GetStream(sessionId);
        Assert.NotNull(stream);
        Assert.Equal(4, stream.Length);
    }

    [Fact]
    public void GetDescriptor_ReturnsNull_ForNonExistentOrEmptySession()
    {
        var store = new InMemoryAssemblySessionStore();

        Assert.Null(store.GetDescriptor("non-existent"));
        Assert.Null(store.GetDescriptor(""));
        Assert.Null(store.GetStream("non-existent"));
    }

    [Fact]
    public void Session_Expires_AfterConfiguredTimeout()
    {
        var timeProvider = new ManualTestTimeProvider();
        var options = Options.Create(new AssemblySessionOptions
        {
            SessionTimeout = TimeSpan.FromMinutes(10),
            SlidingExpiration = false
        });

        var store = new InMemoryAssemblySessionStore(options, timeProvider);
        var descriptor = CreateDummyDescriptor("ExpiringModule");
        var rawBytes = new byte[] { 0x01, 0x02 };

        var sessionId = store.Register(descriptor, rawBytes);
        Assert.NotNull(store.GetDescriptor(sessionId));

        // Avanza il tempo di 11 minuti (oltre il TTL di 10 minuti)
        timeProvider.Advance(TimeSpan.FromMinutes(11));

        Assert.Null(store.GetDescriptor(sessionId));
        Assert.Null(store.GetStream(sessionId));
        Assert.Equal(0, store.ActiveSessionsCount);
    }

    [Fact]
    public void SlidingExpiration_ExtendsSessionLifetime()
    {
        var timeProvider = new ManualTestTimeProvider();
        var options = Options.Create(new AssemblySessionOptions
        {
            SessionTimeout = TimeSpan.FromMinutes(10),
            SlidingExpiration = true
        });

        var store = new InMemoryAssemblySessionStore(options, timeProvider);
        var descriptor = CreateDummyDescriptor("SlidingModule");
        var rawBytes = new byte[] { 0x01, 0x02 };

        var sessionId = store.Register(descriptor, rawBytes);

        // Avanza di 7 minuti e vi accede (rinnova per altri 10 minuti)
        timeProvider.Advance(TimeSpan.FromMinutes(7));
        Assert.NotNull(store.GetDescriptor(sessionId));

        // Avanza di altri 7 minuti (totale 14 minuti da inizio, ma solo 7 dall'ultimo accesso)
        timeProvider.Advance(TimeSpan.FromMinutes(7));
        Assert.NotNull(store.GetDescriptor(sessionId));

        // Ora lasciamo passare 11 minuti senza accessi -> la sessione scade
        timeProvider.Advance(TimeSpan.FromMinutes(11));
        Assert.Null(store.GetDescriptor(sessionId));
    }

    [Fact]
    public void CapacityLimit_EvictsLeastRecentlyUsedSession_WhenCountExceeded()
    {
        var timeProvider = new ManualTestTimeProvider();
        var options = Options.Create(new AssemblySessionOptions
        {
            MaxConcurrentSessions = 2,
            SessionTimeout = TimeSpan.FromHours(1)
        });

        var store = new InMemoryAssemblySessionStore(options, timeProvider);

        var s1 = store.Register(CreateDummyDescriptor("Module1"), [0x01]);
        timeProvider.Advance(TimeSpan.FromSeconds(1));

        var s2 = store.Register(CreateDummyDescriptor("Module2"), [0x02]);
        timeProvider.Advance(TimeSpan.FromSeconds(1));

        // Accediamo a s1 per renderlo più recente di s2
        _ = store.GetDescriptor(s1);
        timeProvider.Advance(TimeSpan.FromSeconds(1));

        // Registriamo s3: il limite è 2 -> deve espellere s2 (che è il meno recentemente usato)
        var s3 = store.Register(CreateDummyDescriptor("Module3"), [0x03]);

        Assert.Equal(2, store.ActiveSessionsCount);
        Assert.NotNull(store.GetDescriptor(s1));
        Assert.Null(store.GetDescriptor(s2)); // Espulso
        Assert.NotNull(store.GetDescriptor(s3));
    }

    [Fact]
    public void MemoryLimit_EvictsOldestSession_WhenTotalBytesExceeded()
    {
        var timeProvider = new ManualTestTimeProvider();
        var options = Options.Create(new AssemblySessionOptions
        {
            MaxTotalBytes = 1000,
            MaxConcurrentSessions = 10,
            SessionTimeout = TimeSpan.FromHours(1)
        });

        var store = new InMemoryAssemblySessionStore(options, timeProvider);

        var b1 = new byte[600];
        var b2 = new byte[600];

        var s1 = store.Register(CreateDummyDescriptor("Big1"), b1);
        Assert.Equal(600, store.TotalStoredBytes);

        // Registrazione del secondo (600 + 600 = 1200 > 1000): deve espellere s1
        var s2 = store.Register(CreateDummyDescriptor("Big2"), b2);

        Assert.Equal(1, store.ActiveSessionsCount);
        Assert.Equal(600, store.TotalStoredBytes);
        Assert.Null(store.GetDescriptor(s1));
        Assert.NotNull(store.GetDescriptor(s2));
    }

    [Fact]
    public void ThreadSafety_ConcurrentRegistrationsAndReads_DoNotThrow()
    {
        var store = new InMemoryAssemblySessionStore();

        Parallel.For(0, 50, i =>
        {
            var sId = store.Register(CreateDummyDescriptor($"Concur_{i}"), [0xAA, 0xBB]);
            var desc = store.GetDescriptor(sId);
            Assert.NotNull(desc);
            using var stream = store.GetStream(sId);
            Assert.NotNull(stream);
        });

        Assert.Equal(50, store.ActiveSessionsCount);
    }
}
