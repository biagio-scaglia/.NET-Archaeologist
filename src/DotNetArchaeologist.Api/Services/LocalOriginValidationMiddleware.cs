using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Middleware di sicurezza locale per la protezione da richieste cross-origin non autorizzate.
/// Blocca richieste provenienti da pagine web esterne (drive-by web attacks o CSRF cross-origin)
/// che tentano di interrogare il server locale su loopback.
/// </summary>
public sealed class LocalOriginValidationMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly HashSet<string> AllowedOrigins = new(StringComparer.OrdinalIgnoreCase)
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5123",
        "http://127.0.0.1:5123"
    };

    public LocalOriginValidationMiddleware(RequestDelegate _next)
    {
        this._next = _next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Controllo header Sec-Fetch-Site: se è cross-site, blocca immediatamente
        if (context.Request.Headers.TryGetValue("Sec-Fetch-Site", out var secFetchSite))
        {
            if (string.Equals(secFetchSite.ToString(), "cross-site", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"Accesso bloccato: le richieste cross-site non sono consentite per l'API locale.\"}");
                return;
            }
        }

        // 2. Controllo header Origin se presente (inviato dai browser durante chiamate Fetch/XHR/CORS)
        if (context.Request.Headers.TryGetValue("Origin", out var originHeader))
        {
            var origin = originHeader.ToString().TrimEnd('/');
            if (!string.IsNullOrEmpty(origin) && !AllowedOrigins.Contains(origin))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"Accesso bloccato: origine cross-origin non autorizzata. L'API di .NET Archaeologist è riservata al frontend locale.\"}");
                return;
            }
        }

        // 3. Controllo header Referer se presente
        if (context.Request.Headers.TryGetValue("Referer", out var refererHeader))
        {
            var referer = refererHeader.ToString();
            if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
            {
                var refererOrigin = $"{refererUri.Scheme}://{refererUri.Authority}".TrimEnd('/');
                if (!AllowedOrigins.Contains(refererOrigin) &&
                    !refererUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) &&
                    !refererUri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"error\":\"Accesso bloccato: referer non autorizzato.\"}");
                    return;
                }
            }
        }

        await _next(context);
    }
}
