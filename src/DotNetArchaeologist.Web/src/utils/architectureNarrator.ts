import type { SolutionDescriptor } from '../types/api'

export interface DiagramNodeLike {
  id: string
  title: string
  category: string
  technology: string
  subtitle?: string
  items: string[]
  assemblyPath?: string | null
}

export interface DiagramEdgeLike {
  fromId: string
  toId: string
  label?: string
  style?: 'inheritance' | 'implements' | 'dependency' | 'data'
}

export interface InOutConnectionDetail {
  connectedNodeTitle: string
  connectedNodeCategory: string
  connectedNodeTech: string
  relationStyle: string
  label?: string
  naturalExplanation: string
}

export interface ArchitectureNarration {
  headline: string
  badge: string
  walkthrough: string
  inflow: InOutConnectionDetail[]
  outflow: InOutConnectionDetail[]
  couplingInsight: string
  recommendation: string
  interactiveQuestions: Array<{ question: string; answer: string }>
  metrics?: {
    totalNodes: number
    totalEdges: number
    webCount: number
    serviceCount: number
    dbCount: number
    batchCount: number
    hubTitle?: string
    hubDegree?: number
    nodeCount: number
    edgeCount: number
    servicesCount: number
    databaseCount: number
    maxHubDegree: number
  }
}

/**
 * Generatore deterministico e ottimizzato di spiegazioni in linguaggio naturale
 * per la topologia delle connessioni, i singoli nodi e gli archi architetturali.
 */
export function narrateArchitectureConnections(
  nodes: DiagramNodeLike[],
  edges: DiagramEdgeLike[],
  selectedNode: DiagramNodeLike | null,
  selectedEdge: DiagramEdgeLike | null,
  solution: SolutionDescriptor | null
): ArchitectureNarration {
  const nodeMap = new Map<string, DiagramNodeLike>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  // 1. CASO: L'UTENTE HA SELEZIONATO UN SINGOLO ARCO / CONNESSIONE
  if (selectedEdge) {
    const from = nodeMap.get(selectedEdge.fromId)
    const to = nodeMap.get(selectedEdge.toId)
    const fromName = from?.title ?? selectedEdge.fromId
    const toName = to?.title ?? selectedEdge.toId
    const style = selectedEdge.style ?? 'dependency'

    let styleDesc = 'una dipendenza funzionale'
    let narrative = ''
    let recommendation = ''

    switch (style) {
      case 'data':
        styleDesc = 'un canale di persistenza dati'
        narrative = `Questa connessione rappresenta il flusso diretto verso la banca dati. Il modulo '${fromName}' (${from?.technology ?? 'Servizio'}) invia comandi SQL, stored procedure o query di entità verso il contesto '${toName}' (${to?.technology ?? 'Database'}). Questo legame rende il business logic strettamente accoppiato allo schema relazionale del database.`
        recommendation = `Per modernizzare questo collegamento, valuta di incapsulare le query dirette all'interno di un repository pattern o di un servizio API dedicato, disaccoppiando il codice applicativo dalle tabelle del database.`
        break
      case 'implements':
        styleDesc = 'un contratto di interfaccia formale'
        narrative = `Questa linea tratteggiata indica l'implementazione di un contratto astratto. Il componente '${fromName}' concretizza le firme dei metodi previste dall'interfaccia '${toName}'. Questo tipo di collegamento rappresenta una buona pratica architetturale (DIP - Dependency Inversion Principle) perché permette la sostituzione polimorfica e facilita l'adozione di dependency injection.`
        recommendation = `Mantieni l'interfaccia isolata in un assembly o pacchetto contratti (.Contracts) in modo che i consumatori non debbano dipendere dall'implementazione concreta.`
        break
      case 'inheritance':
        styleDesc = 'una relazione di ereditarietà ad accoppiamento forte'
        narrative = `Questo arco esprime ereditarietà diretta: '${fromName}' deriva dalla classe base '${toName}'. In questo modo eredita campi, logiche interne e comportamento protetto. Sebbene comoda, l'ereditarietà profonda crea forte rigidità strutturale: qualsiasi modifica alla classe base impatta a cascata tutti i discendenti.`
        recommendation = `Ove possibile, applica il principio 'Composition over Inheritance' incapsulando il comportamento base all'interno di un servizio iniettato.`
        break
      case 'dependency':
      default:
        styleDesc = 'un collegamento di invocazione o riferimento'
        narrative = `Questa connessione testimonia che il componente '${fromName}' (${from?.technology ?? 'Modulo'}) invoca o fa riferimento alle funzionalità offerte da '${toName}' (${to?.technology ?? 'Servizio'}). È il percorso attraverso cui transitano i messaggi operativi nel sistema.`
        recommendation = `Verifica che la comunicazione avvenga tramite protocolli aperti (HTTP/JSON, gRPC o messaggistica asincrona) e non tramite riferimenti binari monolitici.`
        break
    }

    return {
      headline: `🎙️ Connessione: ${fromName} ➔ ${toName}`,
      badge: `COLLEGAMENTO [${style.toUpperCase()}]`,
      walkthrough: narrative,
      inflow: [],
      outflow: [],
      couplingInsight: `Relazione orientata di tipo '${styleDesc}' con etichetta '${selectedEdge.label ?? 'link'}'.`,
      recommendation,
      interactiveQuestions: [
        {
          question: `Perché '${fromName}' chiama '${toName}'?`,
          answer: `Perché '${fromName}' necessita delle capacità o dei dati forniti da '${toName}' per soddisfare il proprio caso d'uso applicativo.`
        },
        {
          question: `Cosa succede se '${toName}' viene modificato o va offline?`,
          answer: `'${fromName}' subirà un errore a runtime o una rottura di compilazione qualora il contratto o lo schema subisca breaking changes.`
        }
      ]
    }
  }

  // 2. CASO: L'UTENTE HA SELEZIONATO UN SINGOLO NODO
  if (selectedNode) {
    const incomingEdges = edges.filter(e => e.toId === selectedNode.id)
    const outgoingEdges = edges.filter(e => e.fromId === selectedNode.id)

    const inflow: InOutConnectionDetail[] = incomingEdges.map(e => {
      const src = nodeMap.get(e.fromId)
      return {
        connectedNodeTitle: src?.title ?? e.fromId,
        connectedNodeCategory: src?.category ?? 'Modulo',
        connectedNodeTech: src?.technology ?? 'N/D',
        relationStyle: e.style ?? 'dependency',
        label: e.label,
        naturalExplanation: `Invocato da '${src?.title ?? e.fromId}' (${src?.technology ?? 'Modulo'}) via ${e.label ?? 'chiamata'}.`
      }
    })

    const outflow: InOutConnectionDetail[] = outgoingEdges.map(e => {
      const dst = nodeMap.get(e.toId)
      return {
        connectedNodeTitle: dst?.title ?? e.toId,
        connectedNodeCategory: dst?.category ?? 'Modulo',
        connectedNodeTech: dst?.technology ?? 'N/D',
        relationStyle: e.style ?? 'dependency',
        label: e.label,
        naturalExplanation: `Interroga a valle '${dst?.title ?? e.toId}' (${dst?.technology ?? 'Modulo'}) via ${e.label ?? 'relazione'}.`
      }
    })

    const totalConnections = incomingEdges.length + outgoingEdges.length
    let couplingInsight = ''
    if (totalConnections >= 4) {
      couplingInsight = `Questo componente è uno snodo critico (Hub ad alto accoppiamento) con ${totalConnections} collegamenti attivi. Modificarlo comporta un alto rischio di impatto collaterale.`
    } else if (totalConnections === 0) {
      couplingInsight = `Componente attualmente isolato o foglia autonoma: non presenta archi diretti tracciati nel perimetro corrente.`
    } else {
      couplingInsight = `Componente con livello di accoppiamento equilibrato (${incomingEdges.length} in entrata, ${outgoingEdges.length} in uscita).`
    }

    let roleExplanation = ''
    switch (selectedNode.category) {
      case 'Service':
        roleExplanation = `Questo componente funge da orchestratore di business logic. Espone contratti di servizio e coordina le transazioni tra l'interfaccia utente e i sistemi di memorizzazione.`
        break
      case 'Database':
        roleExplanation = `Questo nodo rappresenta il livello di persistenza. Contiene tabelle, entità e logiche di accesso ai dati SQL o stored procedure utilizzate dai servizi applicativi.`
        break
      case 'Web':
        roleExplanation = `Questo componente è la porta d'accesso frontend del sistema. Riceve le richieste degli utenti e le instrada verso i servizi applicativi di backend.`
        break
      case 'Batch':
        roleExplanation = `Questo nodo è un worker di elaborazione asincrona. Opera tipicamente in background per eseguire compiti schedulati, elaborazione di code o bonifica massiva.`
        break
      default:
        roleExplanation = `Questo componente rappresenta una struttura di tipo '${selectedNode.category}' che incapsula specifiche responsabilità funzionali nel dominio applicativo.`
        break
    }

    const walkthrough = `Ti spiego il ruolo di '${selectedNode.title}': fa parte della categoria [${selectedNode.category}] ed è sviluppato con tecnologia '${selectedNode.technology}'.

📋 Ruolo Architetturale:
${roleExplanation}

${
  inflow.length > 0
    ? `📥 Flusso a Monte (Inflow: ${inflow.length}):\nRiceve chiamate o messaggi operativi da: ${inflow.map(i => `'${i.connectedNodeTitle}'`).slice(0, 3).join(', ')}.`
    : `📥 Flusso a Monte:\nNessun consumatore diretto a monte rilevato nel perimetro.`
}

${
  outflow.length > 0
    ? `📤 Flusso a Valle (Outflow: ${outflow.length}):\nPer completare le sue operazioni si appoggia a: ${outflow.map(o => `'${o.connectedNodeTitle}'`).slice(0, 3).join(', ')}.`
    : `📤 Flusso a Valle:\nNessuna chiamata a valle verso altri nodi tracciati.`
}`

    let recommendation = `Mantieni l'interfaccia di '${selectedNode.title}' stabile per tutelare i consumatori a monte. Per qualsiasi refactoring, predisponi test di regressione sui nodi connessi.`
    if (selectedNode.category === 'Service' && selectedNode.technology.toLowerCase().includes('wcf')) {
      recommendation = `Dato che '${selectedNode.title}' impiega WCF (SOAP), è raccomandata la migrazione verso ASP.NET Core Minimal APIs o gRPC, preservando la compatibilità con i client consumatori.`
    } else if (selectedNode.category === 'Database' && selectedNode.technology.toLowerCase().includes('objectcontext')) {
      recommendation = `Il contesto dati '${selectedNode.title}' utilizza ObjectContext/EF legacy: programma la transizione verso DbContext di Entity Framework Core per abilitare compatibilità nativa con .NET 8+.`
    }

    return {
      headline: `🎙️ L'Archeologo Spiega: ${selectedNode.title}`,
      badge: `RUOLO [${selectedNode.category.toUpperCase()}]`,
      walkthrough,
      inflow,
      outflow,
      couplingInsight,
      recommendation,
      interactiveQuestions: [
        {
          question: `Chi subisce impatti se '${selectedNode.title}' va in errore?`,
          answer: inflow.length > 0
            ? `I consumatori a monte (${inflow.map(i => i.connectedNodeTitle).join(', ')}) falliranno o riceveranno eccezioni nelle rispettive operazioni.`
            : `Non essendo invocato direttamente da altri componenti tracciati, l'impatto resta confinato alle interazioni esterne dell'utente.`
        },
        {
          question: `Da quali risorse a valle dipende per funzionare?`,
          answer: outflow.length > 0
            ? `Dipende direttamente da: ${outflow.map(o => `${o.connectedNodeTitle} [${o.connectedNodeCategory}]`).join(', ')}.`
            : `È completamente autonomo o gestisce lo stato internamente senza dipendenze a valle visibili nel grafo.`
        }
      ]
    }
  }

  // 3. CASO GENERALE: PANORAMA GLOBALE DELLE CONNESSIONI ARCHITETTURALI
  const webNodes = nodes.filter(n => n.category === 'Web')
  const svcNodes = nodes.filter(n => n.category === 'Service')
  const dbNodes = nodes.filter(n => n.category === 'Database')
  const batchNodes = nodes.filter(n => n.category === 'Batch')

  // Trova il nodo più interconnesso (Hub)
  const degreeMap = new Map<string, number>()
  edges.forEach(e => {
    degreeMap.set(e.fromId, (degreeMap.get(e.fromId) ?? 0) + 1)
    degreeMap.set(e.toId, (degreeMap.get(e.toId) ?? 0) + 1)
  })

  let hubNode: DiagramNodeLike | null = null
  let maxDegree = 0
  degreeMap.forEach((degree, id) => {
    if (degree > maxDegree) {
      maxDegree = degree
      hubNode = nodeMap.get(id) ?? null
    }
  })

  const solutionName = solution?.name
  const generalWalkthrough = `Benvenuto nella mappa delle connessioni del sistema!${solutionName ? ` (Soluzione: ${solutionName})` : ''}

📌 Topologia Complessiva:
L'architettura comprende ${nodes.length} nodi e ${edges.length} connessioni tracciate.

🔄 Flusso Operativo:
Le richieste entrano dal layer di presentazione (${webNodes.length} moduli Web), fluiscono attraverso i servizi di logica di business (${svcNodes.length} servizi) e raggiungono i contesti di persistenza (${dbNodes.length} contesti dati).${
    batchNodes.length > 0
      ? `\n\n⚙️ Background Workers:\nParallelamente operano ${batchNodes.length} worker batch che eseguono compiti schedulati e processi in background.`
      : ''
  }${
    hubNode
      ? `\n\n⚡ Snodo Nevralgico:\nIl punto nevralgico con il massimo numero di collegamenti è '${(hubNode as DiagramNodeLike).title}' con ${maxDegree} connessioni attive.`
      : ''
  }

👉 Fai clic su qualsiasi componente o linea di collegamento per ascoltare la spiegazione dettagliata del suo ruolo e dei flussi scambiati!`

  return {
    headline: "🎙️ L'Archeologo Spiega la Topologia delle Connessioni",
    badge: 'PANORAMA DI RETE COMPLETO',
    walkthrough: generalWalkthrough,
    inflow: [],
    outflow: [],
    couplingInsight: hubNode
      ? `Snodo principale del grafo: '${(hubNode as DiagramNodeLike).title}' con ${maxDegree} collegamenti (inflow + outflow).`
      : `Il grafo presenta una connettività distribuita uniforme.`,
    recommendation: `Isola le dipendenze tra i layer Web e Database introducendo contratti di servizio e API gateway per ridurre l'accoppiamento a cascata.`,
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      webCount: webNodes.length,
      serviceCount: svcNodes.length,
      dbCount: dbNodes.length,
      batchCount: batchNodes.length,
      hubTitle: hubNode ? (hubNode as DiagramNodeLike).title : undefined,
      hubDegree: maxDegree > 0 ? maxDegree : undefined,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      servicesCount: svcNodes.length,
      databaseCount: dbNodes.length,
      maxHubDegree: maxDegree,
    },
    interactiveQuestions: [
      {
        question: 'Come viaggiano le informazioni dal Web al Database?',
        answer: 'I controller o le viste Web ricevono l\'input utente, invocano i contratti di servizio (SOAP/REST) e i servizi delegano la lettura/scrittura all\'ORM (Entity Framework) per comunicare con il database.'
      },
      {
        question: 'Qual è il punto di maggiore rischio di accoppiamento?',
        answer: hubNode
          ? `'${(hubNode as DiagramNodeLike).title}' è il componente più interconnesso (${maxDegree} collegamenti): qualsiasi regressione qui ha un raggio d'impatto elevato.`
          : 'L\'accoppiamento tra il layer di servizio e i database relazionali con stored procedure.'
      },
      {
        question: 'Come posso modernizzare questa topologia verso i container?',
        answer: 'Separa i batch worker in container indipendenti (Kubernetes CronJobs/Worker), converti i servizi WCF in ASP.NET Core Minimal APIs ed esponi contratti OpenAPI per tutti i client.'
      }
    ]
  }
}
