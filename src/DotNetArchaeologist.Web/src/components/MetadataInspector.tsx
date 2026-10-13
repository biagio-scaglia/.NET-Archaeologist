import React from 'react'
import type { TypeInfo } from '../types/api'

interface MetadataInspectorProps {
  typeInfo: TypeInfo | null
}

export const MetadataInspector: React.FC<MetadataInspectorProps> = ({ typeInfo }) => {
  if (!typeInfo) {
    return (
      <div style={{ padding: 8, color: '#666', fontStyle: 'italic', fontSize: 11 }}>
        Nessun metadato da mostrare. Seleziona una classe o interfaccia.
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 6, fontSize: 11 }}>
      <fieldset style={{ marginBottom: 8 }}>
        <legend>Definizione Tipo</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '3px 8px' }}>
          <strong>Nome Completo:</strong>
          <span style={{ wordBreak: 'break-all' }}>{typeInfo.fullName}</span>

          <strong>Namespace:</strong>
          <span>{typeInfo.namespace || '<Global>'}</span>

          <strong>Tipologia:</strong>
          <span>{typeInfo.kind}</span>

          <strong>Visibilita:</strong>
          <span>{typeInfo.accessibility}</span>

          <strong>Modificatori:</strong>
          <span>
            {[
              typeInfo.isAbstract && 'Abstract',
              typeInfo.isSealed && 'Sealed',
              typeInfo.isStatic && 'Static',
              typeInfo.isNested && 'Nested'
            ].filter(Boolean).join(', ') || 'Nessuno'}
          </span>

          <strong>Tipo Base:</strong>
          <span style={{ wordBreak: 'break-all' }}>{typeInfo.baseTypeFullName || 'Nessuno'}</span>
        </div>
      </fieldset>

      {typeInfo.implementedInterfaces.length > 0 && (
        <fieldset style={{ marginBottom: 8 }}>
          <legend>Interfacce Implementate ({typeInfo.implementedInterfaces.length})</legend>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {typeInfo.implementedInterfaces.map(iface => (
              <li key={iface} style={{ wordBreak: 'break-all' }}>{iface}</li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend>Membri Dichiarati ({typeInfo.members.length})</legend>
        {typeInfo.members.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>Nessun membro esplicito.</div>
        ) : (
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #808080' }}>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Accesso</th>
                  <th>Modificatori</th>
                </tr>
              </thead>
              <tbody>
                {typeInfo.members.map((m, idx) => (
                  <tr key={`${m.name}-${idx}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td>[{m.kind}]</td>
                    <td style={{ fontWeight: m.kind === 'Constructor' ? 'bold' : 'normal' }}>{m.name}</td>
                    <td>{m.accessibility}</td>
                    <td>{m.isStatic ? 'Static' : m.isVirtual ? 'Virtual' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>
    </div>
  )
}
