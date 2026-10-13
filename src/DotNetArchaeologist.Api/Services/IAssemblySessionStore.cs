using System.IO;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Contratto per la gestione dello stato in memoria delle sessioni di ispezione locali.
/// </summary>
public interface IAssemblySessionStore
{
    /// <summary>
    /// Registra un nuovo assembly ispezionato nella sessione in memoria.
    /// </summary>
    string Register(AssemblyDescriptor descriptor, byte[] rawBytes);

    /// <summary>
    /// Recupera i metadati dell'assembly per l'identificatore di sessione specificato.
    /// </summary>
    AssemblyDescriptor? GetDescriptor(string sessionId);

    /// <summary>
    /// Restituisce uno stream di sola lettura posizionato all'inizio dei byte dell'assembly.
    /// </summary>
    Stream? GetStream(string sessionId);
}
