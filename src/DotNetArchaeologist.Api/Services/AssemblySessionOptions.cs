using System;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Opzioni di configurazione per la gestione delle sessioni di ispezione assembly in memoria.
/// </summary>
public sealed class AssemblySessionOptions
{
    public const string SectionName = "AssemblySession";

    /// <summary>
    /// Durata massima di inattività o vita della sessione prima della scadenza (TTL).
    /// Default: 60 minuti.
    /// </summary>
    public TimeSpan SessionTimeout { get; set; } = TimeSpan.FromMinutes(60);

    /// <summary>
    /// Se true, ogni accesso alla sessione rinnova il timeout di inattività (sliding expiration).
    /// Default: true.
    /// </summary>
    public bool SlidingExpiration { get; set; } = true;

    /// <summary>
    /// Numero massimo di sessioni concorrenti conservate contemporaneamente in memoria RAM.
    /// Superato tale limite, le sessioni meno recentemente utilizzate (LRU) vengono espulse.
    /// Default: 50 sessioni.
    /// </summary>
    public int MaxConcurrentSessions { get; set; } = 50;

    /// <summary>
    /// Limite massimo aggregato in byte per i binari di assembly conservati in memoria RAM.
    /// Superato tale limite, vengono espulse le sessioni più vecchie per prevenire OutOfMemory.
    /// Default: 500 MB.
    /// </summary>
    public long MaxTotalBytes { get; set; } = 500 * 1024 * 1024;
}
