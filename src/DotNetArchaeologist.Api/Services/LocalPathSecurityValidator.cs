using System;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Http;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Risultato della validazione di sicurezza di un percorso o file locale.
/// </summary>
public sealed record PathValidationResult(bool IsValid, string? NormalizedPath, string? ErrorMessage, int StatusCode = 400)
{
    public static PathValidationResult Success(string normalizedPath) =>
        new(true, normalizedPath, null, 200);

    public static PathValidationResult Failure(string errorMessage, int statusCode = 400) =>
        new(false, null, errorMessage, statusCode);
}

/// <summary>
/// Servizio di validazione di sicurezza per l'accesso al filesystem locale.
/// Impedisce l'accesso a directory di sistema sensibili, percorsi UNC remoti non attendibili,
/// file di dimensioni eccessive o con estensioni non consentite.
/// </summary>
public static class LocalPathSecurityValidator
{
    public const long DefaultMaxFileSizeBytes = 250 * 1024 * 1024; // 250 MB
    public const int DefaultMaxDiscoveredAssemblies = 2000;

    private static readonly string[] AllowedAssemblyExtensions = [".dll", ".exe"];
    private static readonly string[] AllowedSolutionExtensions = [".sln", ".slnx"];

    /// <summary>
    /// Valida il percorso di un singolo assembly compilato.
    /// </summary>
    public static PathValidationResult ValidateAssemblyPath(string? rawPath, long maxSizeBytes = DefaultMaxFileSizeBytes)
    {
        if (string.IsNullOrWhiteSpace(rawPath))
        {
            return PathValidationResult.Failure("Specificare un percorso di file valido per l'assembly.", 400);
        }

        string fullPath;
        try
        {
            fullPath = Path.GetFullPath(rawPath.Trim());
        }
        catch (Exception ex)
        {
            return PathValidationResult.Failure($"Percorso file non valido o malformato: {ex.Message}", 400);
        }

        // Verifica percorsi remoti UNC (es. \\attacker\share)
        if (IsUncOrNetworkPath(fullPath))
        {
            return PathValidationResult.Failure("L'accesso a percorsi di rete remoti UNC non è consentito per motivi di sicurezza.", 403);
        }

        // Verifica estensione ammessa (.dll, .exe)
        var extension = Path.GetExtension(fullPath);
        if (string.IsNullOrEmpty(extension) || !AllowedAssemblyExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            return PathValidationResult.Failure(
                $"Estensione '{extension}' non consentita. L'ispezione è limitata esclusivamente ad assembly .NET (.dll, .exe).", 400);
        }

        // Verifica cartelle di sistema protette
        if (IsProtectedSystemDirectory(fullPath))
        {
            return PathValidationResult.Failure("L'accesso alle directory di sistema del sistema operativo è bloccato.", 403);
        }

        // Verifica esistenza
        if (!File.Exists(fullPath))
        {
            return PathValidationResult.Failure($"File dell'assembly non trovato sul percorso: '{fullPath}'.", 404);
        }

        // Verifica dimensione massima
        try
        {
            var fileInfo = new FileInfo(fullPath);
            if (fileInfo.Length > maxSizeBytes)
            {
                var sizeMb = fileInfo.Length / (1024 * 1024);
                var maxMb = maxSizeBytes / (1024 * 1024);
                return PathValidationResult.Failure(
                    $"Il file specificato ({sizeMb} MB) supera il limite massimo consentito di {maxMb} MB per prevenire l'esaurimento delle risorse.", 400);
            }
        }
        catch (UnauthorizedAccessException)
        {
            return PathValidationResult.Failure($"Accesso negato durante la lettura del file: '{fullPath}'.", 403);
        }
        catch (Exception ex)
        {
            return PathValidationResult.Failure($"Impossibile accedere alle informazioni del file: {ex.Message}", 400);
        }

        return PathValidationResult.Success(fullPath);
    }

    /// <summary>
    /// Valida il percorso di una cartella per la scansione di assembly.
    /// </summary>
    public static PathValidationResult ValidateFolderPath(string? rawPath)
    {
        if (string.IsNullOrWhiteSpace(rawPath))
        {
            return PathValidationResult.Failure("Specificare un percorso di cartella valido.", 400);
        }

        string fullPath;
        try
        {
            fullPath = Path.GetFullPath(rawPath.Trim());
        }
        catch (Exception ex)
        {
            return PathValidationResult.Failure($"Percorso cartella non valido o malformato: {ex.Message}", 400);
        }

        if (IsUncOrNetworkPath(fullPath))
        {
            return PathValidationResult.Failure("L'accesso a cartelle di rete remote UNC non è consentito per motivi di sicurezza.", 403);
        }

        if (IsProtectedSystemDirectory(fullPath))
        {
            return PathValidationResult.Failure("La scansione delle directory di sistema del sistema operativo è bloccata.", 403);
        }

        // Blocca la scansione della radice dell'unità disco (es. C:\) senza sotto-cartelle
        var root = Path.GetPathRoot(fullPath);
        if (string.Equals(fullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
                          root?.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
                          StringComparison.OrdinalIgnoreCase))
        {
            return PathValidationResult.Failure("La scansione ricorsiva dell'intera radice dell'unità disco non è consentita. Specificare una cartella di progetto.", 400);
        }

        if (!Directory.Exists(fullPath))
        {
            return PathValidationResult.Failure($"Cartella non trovata sul percorso specificato: '{fullPath}'.", 404);
        }

        return PathValidationResult.Success(fullPath);
    }

    /// <summary>
    /// Valida il percorso di una Solution (.sln, .slnx) o cartella associata.
    /// </summary>
    public static PathValidationResult ValidateSolutionOrFolderPath(string? rawPath)
    {
        if (string.IsNullOrWhiteSpace(rawPath))
        {
            return PathValidationResult.Failure("Specificare il percorso del file .sln o della cartella di progetto.", 400);
        }

        string fullPath;
        try
        {
            fullPath = Path.GetFullPath(rawPath.Trim());
        }
        catch (Exception ex)
        {
            return PathValidationResult.Failure($"Percorso non valido o malformato: {ex.Message}", 400);
        }

        if (IsUncOrNetworkPath(fullPath))
        {
            return PathValidationResult.Failure("L'accesso a percorsi di rete remoti UNC non è consentito per motivi di sicurezza.", 403);
        }

        if (IsProtectedSystemDirectory(fullPath))
        {
            return PathValidationResult.Failure("L'accesso alle directory di sistema del sistema operativo è bloccato.", 403);
        }

        if (File.Exists(fullPath))
        {
            var ext = Path.GetExtension(fullPath);
            if (!AllowedSolutionExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
            {
                return PathValidationResult.Failure(
                    $"Il file specificato ha estensione '{ext}'. L'ispezione richiede un file di Solution (.sln, .slnx) o una cartella.", 400);
            }

            return PathValidationResult.Success(fullPath);
        }

        if (Directory.Exists(fullPath))
        {
            var root = Path.GetPathRoot(fullPath);
            if (string.Equals(fullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
                              root?.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
                              StringComparison.OrdinalIgnoreCase))
            {
                return PathValidationResult.Failure("L'analisi architetturale dell'intera radice del disco non è consentita. Specificare una cartella di progetto.", 400);
            }

            return PathValidationResult.Success(fullPath);
        }

        return PathValidationResult.Failure($"Percorso della Solution o cartella non trovato: '{fullPath}'.", 404);
    }

    /// <summary>
    /// Valida il file caricato via form multipart.
    /// </summary>
    public static PathValidationResult ValidateUploadedFile(IFormFile? file, long maxSizeBytes = DefaultMaxFileSizeBytes)
    {
        if (file == null || file.Length == 0)
        {
            return PathValidationResult.Failure("Il file caricato è vuoto o mancante.", 400);
        }

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext) || !AllowedAssemblyExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
        {
            return PathValidationResult.Failure(
                $"Estensione del file caricato '{ext}' non supportata. Caricare esclusivamente file assembly .NET (.dll, .exe).", 400);
        }

        if (file.Length > maxSizeBytes)
        {
            var sizeMb = file.Length / (1024 * 1024);
            var maxMb = maxSizeBytes / (1024 * 1024);
            return PathValidationResult.Failure(
                $"Il file caricato ({sizeMb} MB) supera il limite massimo consentito di {maxMb} MB.", 400);
        }

        return PathValidationResult.Success(file.FileName);
    }

    private static bool IsUncOrNetworkPath(string fullPath)
    {
        return fullPath.StartsWith(@"\\", StringComparison.Ordinal) ||
               fullPath.StartsWith("//", StringComparison.Ordinal);
    }

    private static bool IsProtectedSystemDirectory(string fullPath)
    {
        try
        {
            var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            if (!string.IsNullOrEmpty(winDir) && fullPath.StartsWith(winDir, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var sysDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
            if (!string.IsNullOrEmpty(sysDir) && fullPath.StartsWith(sysDir, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        catch
        {
            // Se fallisce l'estrazione delle cartelle speciali, procedi
        }

        return false;
    }
}
