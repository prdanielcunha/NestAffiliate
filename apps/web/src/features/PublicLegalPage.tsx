import { useEffect, useMemo, useState } from 'react';

type Locale='pt-BR'|'en'|'es';
type LegalKind='privacy'|'terms'|'data-deletion';
type LegalSection=[title:string,paragraphs:string[]];
type LegalContent={title:string;intro:string;sections:LegalSection[]};
type LegalLocaleCopy=Record<LegalKind,LegalContent>;

const CONTACT='nestaffiliate@millionsnest.com';
const SITE='https://nestaffiliate.millionsnest.com';
const UPDATED='2026-10-21';

function legalCopy(locale:Locale,kind:LegalKind){
  const pt:LegalLocaleCopy={
    privacy:{
      title:'Política de Privacidade',
      intro:'Esta Política explica como o NestAffiliate, produto do ecossistema MillionsNest, trata dados ao oferecer recursos de inteligência de afiliados, criação de campanhas, publicação assistida e análise de desempenho.',
      sections:[
        ['1. Dados que tratamos',[
          'Dados de conta e identidade necessários para autenticação, como nome, e-mail, identificadores do Firebase/Google e organização ativa.',
          'Dados operacionais do workspace, como campanhas, produtos selecionados, links de afiliado, aprovações, preferências, publicações, métricas e registros de auditoria.',
          'Dados de integrações externas somente quando você conecta ou autoriza uma plataforma, como identificadores de conta, escopos concedidos e tokens necessários à integração. Segredos e tokens não devem ser expostos no navegador ou em documentos públicos.',
          'Dados técnicos essenciais para segurança e funcionamento, como eventos de erro, versão do aplicativo, preferências locais, informações básicas de dispositivo/navegador e registros técnicos de acesso quando fornecidos pela infraestrutura.'
        ]],
        ['2. Como usamos os dados',[
          'Autenticar usuários e aplicar permissões por organização e função.',
          'Criar, revisar, versionar, aprovar e acompanhar campanhas de afiliados.',
          'Validar Product Truth, compliance, disponibilidade, links e prevenção de duplicação/spam.',
          'Gerar análises e aprendizado a partir do uso e de resultados registrados, sem permitir que IA altere fatos comerciais do produto.',
          'Manter segurança, auditoria, prevenção de fraude, estabilidade e suporte.'
        ]],
        ['3. Bases e princípios de tratamento',[
          'Tratamos dados conforme a finalidade do serviço, execução da relação com o usuário, cumprimento de obrigações aplicáveis, legítimos interesses compatíveis com segurança/operação e consentimento quando este for necessário.',
          'Aplicamos minimização, finalidade, transparência, segurança, necessidade e controle de acesso. O NestAffiliate foi desenhado para separar dados por organização e função.'
        ]],
        ['4. Compartilhamento',[
          'Podemos utilizar provedores de infraestrutura e autenticação necessários para operar o serviço, como Firebase/Google Cloud.',
          'Quando você autoriza uma integração, dados estritamente necessários podem ser enviados ou recebidos de plataformas como Pinterest, Mercado Livre ou Shopee conforme as permissões concedidas e os termos dessas plataformas.',
          'Não vendemos dados pessoais a anunciantes.'
        ]],
        ['5. Pinterest e outras integrações',[
          'A API do Pinterest ainda não está conectada: o acesso Trial do aplicativo 1625057 foi negado em 20/10/2026 e está sujeito à reavaliação. Quando houver aprovação, qualquer conexão utilizará OAuth com escopos explicitamente autorizados pelo titular.',
          'O NestAffiliate não solicita sua senha do Pinterest nem deve armazenar cookies de sessão da plataforma.',
          'Você pode revogar o acesso da integração a qualquer momento nas configurações da plataforma conectada ou solicitar a desvinculação pelo contato informado nesta política.'
        ]],
        ['6. Retenção e exclusão',[
          'Mantemos dados enquanto forem necessários para fornecer o serviço, manter histórico/auditoria, cumprir obrigações aplicáveis e proteger a segurança do sistema.',
          'Quando uma exclusão for solicitada e não houver obrigação legítima de retenção, os dados elegíveis serão excluídos ou anonimizados conforme aplicável.',
          'Instruções específicas estão disponíveis em /data-deletion.'
        ]],
        ['7. Segurança',[
          'Utilizamos autenticação, RBAC, isolamento por organização, regras de acesso no banco de dados, registros de auditoria, TLS/HTTPS e controles de segurança da infraestrutura.',
          'Nenhum sistema é absolutamente imune a riscos; por isso mantemos controles de prevenção, detecção e correção.'
        ]],
        ['8. Seus direitos',[
          'Você pode solicitar informações sobre seus dados, correção, acesso, portabilidade quando aplicável, revogação de consentimento e exclusão nos limites previstos pela legislação aplicável, inclusive a LGPD no Brasil.',
          'Para exercer seus direitos, escreva para '+CONTACT+'.'
        ]],
        ['9. Crianças e adolescentes',[
          'O NestAffiliate é uma ferramenta de operação comercial e não é direcionado a crianças. Não coletamos intencionalmente dados de crianças para uso independente do serviço.'
        ]],
        ['10. Atualizações desta política',[
          'Podemos atualizar esta Política quando o produto, as integrações ou requisitos legais mudarem. A data da versão vigente permanece indicada nesta página.'
        ]],
        ['11. Limites específicos de dados do Pinterest',[
          'MillionsNest é a marca responsável pelo NestAffiliate. Contato: '+CONTACT+'. Não somos um aplicativo oficial do Pinterest nem afirmamos possuir aprovação de API enquanto ela não existir.',
          'Quando autorizada, a integração usa dados da própria conta conectada somente para os serviços solicitados. Informações obtidas pela API do Pinterest não serão armazenadas além das exceções permitidas pela plataforma, como análises de campanhas acessadas com autorização expressa.',
          'Não vendemos ou compartilhamos dados do Pinterest com redes de anúncios de terceiros; não usamos materiais do Pinterest para treinar ou aprimorar modelos de IA e não fornecemos comparativos de concorrentes ou da plataforma sem autorização escrita.',
          'O usuário deve ter direitos sobre imagens e conteúdo enviados, escolher individualmente as ações e cumprir as regras de conteúdo comercial, transparência de links afiliados e prevenção de spam.'
        ]]
      ]
    },
    terms:{
      title:'Termos de Uso',
      intro:'Estes Termos regulam o uso do NestAffiliate, ferramenta do ecossistema MillionsNest para operação de marketing de afiliados com revisão humana obrigatória.',
      sections:[
        ['1. Uso do serviço',[
          'Você deve utilizar o NestAffiliate de forma lícita, em conformidade com as regras das plataformas, programas de afiliados e legislação aplicável.',
          'Você é responsável pelas contas externas que conecta, pelas autorizações concedidas e pela veracidade das informações que fornece manualmente.'
        ]],
        ['2. Aprovação humana',[
          'O NestAffiliate não substitui a decisão humana sobre publicação. Campanhas devem ser revisadas e aprovadas antes de serem publicadas.',
          'Automação e recomendações não eliminam a responsabilidade do usuário de verificar produto, link, disponibilidade, disclosure e adequação da publicação.'
        ]],
        ['3. Fatos comerciais e IA',[
          'Preço, estoque, comissão, avaliação, reputação e outros fatos comerciais não devem ser inventados por IA.',
          'O sistema separa Product Truth de Creative Narrative e pode bloquear publicação quando não consegue confirmar condições mínimas de segurança ou veracidade.'
        ]],
        ['4. Afiliados e divulgação',[
          'O usuário deve cumprir os termos de cada programa de afiliados e deixar clara a natureza comercial/afiliada do conteúdo quando exigido.',
          'Comissões, elegibilidade, rastreamento e pagamentos são definidos pelas plataformas de afiliados, não pelo NestAffiliate.'
        ]],
        ['5. Integrações de terceiros',[
          'Pinterest, Mercado Livre, Shopee, Google e outros serviços conectados possuem termos, políticas, limites e disponibilidade próprios.',
          'Mudanças, suspensões ou indisponibilidade de terceiros podem afetar determinadas funções sem invalidar as demais funcionalidades do NestAffiliate.'
        ]],
        ['6. Proibições',[
          'Não use o serviço para spam, manipulação de métricas, fraude, violação de direitos autorais, coleta indevida de dados, credenciais de terceiros ou conteúdo ilegal.',
          'Não tente contornar controles de acesso, limites de plataforma, Publishing Guard, regras de organização ou mecanismos de segurança.'
        ]],
        ['7. Disponibilidade e mudanças',[
          'O produto pode evoluir, receber correções e alterar integrações quando requisitos técnicos, segurança ou políticas externas mudarem.',
          'Recursos dependentes de aprovação externa podem permanecer indisponíveis até que a plataforma responsável conceda o acesso necessário.'
        ]],
        ['8. Limitação operacional',[
          'Resultados de marketing, vendas, alcance, comissão ou receita não são garantidos.',
          'O NestAffiliate oferece ferramentas de decisão e operação; resultados dependem de mercado, plataforma, produto, audiência, execução e fatores externos.'
        ]],
        ['9. Contato',['Dúvidas sobre estes Termos podem ser enviadas para '+CONTACT+'.']],
        ['10. Conduta específica para Pinterest',['O usuário deve selecionar cada Pin individualmente antes de qualquer envio. Não são permitidos publicação afiliada em massa, spam, engajamento artificial, scraping, uso indevido de contas ou contorno de consentimento e limites de API.','É proibido usar materiais do Pinterest para treinar modelos de IA ou oferecer benchmarks de concorrentes da plataforma sem autorização escrita. Imagens e textos de terceiros exigem os direitos necessários; links afiliados devem informar claramente sua finalidade comercial.']]
      ]
    },
    'data-deletion':{
      title:'Exclusão de Dados e Desconexão',
      intro:'Use estas instruções para solicitar a exclusão de dados do NestAffiliate ou revogar uma integração externa.',
      sections:[
        ['1. Desconectar uma plataforma',[
          'Revogue primeiro a autorização diretamente nas configurações da plataforma conectada quando essa opção estiver disponível.',
          'Depois, solicite ao NestAffiliate a remoção dos tokens e dados de conexão remanescentes relacionados à integração.'
        ]],
        ['2. Solicitar exclusão',[
          'Envie um e-mail para '+CONTACT+' com o assunto “Exclusão de dados — NestAffiliate”.',
          'Informe o e-mail da conta utilizada no NestAffiliate e, se souber, a organização relacionada. Não envie senha, token, segredo ou código de autenticação.',
          'A solicitação será verificada para evitar exclusões indevidas. Dados elegíveis serão removidos ou anonimizados, respeitando eventuais obrigações legais, prevenção de fraude, segurança e registros que precisem ser preservados.'
        ]],
        ['3. Dados que podem ser abrangidos',[
          'Perfil operacional do produto, preferências, campanhas, versões, publicações, resultados, integrações e outros dados associados à organização ou ao usuário, conforme a natureza da solicitação e as permissões existentes.'
        ]],
        ['4. Dados em plataformas externas',[
          'Excluir dados do NestAffiliate não exclui automaticamente Pins, produtos, históricos ou dados mantidos por Pinterest, Mercado Livre, Shopee, Google ou outras plataformas. Esses dados devem ser gerenciados diretamente na respectiva plataforma.'
        ]]
      ]
    }
  };

  const en:LegalLocaleCopy={
    privacy:{title:'Privacy Policy',intro:'This Policy explains how NestAffiliate, a MillionsNest ecosystem product, handles data while providing affiliate intelligence, campaign creation, assisted publishing and performance analysis.',sections:[
      ['1. Data we process',['Account and identity data required for authentication, such as name, email, Firebase/Google identifiers and active organization.','Workspace operational data such as campaigns, selected products, affiliate links, approvals, preferences, publications, metrics and audit records.','External integration data only when you connect or authorize a platform, including account identifiers, granted scopes and tokens required by the integration. Secrets and tokens must not be exposed in the browser or public documents.','Essential technical data used for security and operation, such as errors, app version, local preferences and infrastructure access records when available.']],
      ['2. How we use data',['Authenticate users and enforce organization/role permissions.','Create, review, version, approve and measure affiliate campaigns.','Validate Product Truth, compliance, availability, links and duplicate/spam prevention.','Generate analytics and learning from use and recorded results without allowing AI to overwrite commercial facts.','Maintain security, auditability, stability and support.']],
      ['3. Processing principles',['We process data to provide the service, fulfill applicable obligations, support compatible legitimate operational/security interests, and obtain consent when required.','We apply purpose limitation, minimization, transparency, security and access controls, including tenant isolation.']],
      ['4. Sharing',['We may use infrastructure and authentication providers required to operate the service, including Firebase/Google Cloud.','When you authorize an integration, strictly necessary data may be exchanged with platforms such as Pinterest, Mercado Livre or Shopee according to granted permissions and their terms.','We do not sell personal data to advertisers.']],
      ['5. Pinterest and integrations',['Pinterest API access is currently unavailable: Trial access for app 1625057 was denied on October 20, 2026 and awaits re-review. When approved, any connection will use OAuth and only scopes explicitly authorized by the account owner.','NestAffiliate does not ask for your Pinterest password and must not store Pinterest session cookies.','You may revoke access in the connected platform settings or request unlinking using the contact below.']],
      ['6. Retention and deletion',['We retain data while needed to provide the service, preserve security/audit history and meet applicable obligations.','Eligible data will be deleted or anonymized when deletion is validly requested and no legitimate retention requirement applies.','Specific instructions are available at /data-deletion.']],
      ['7. Security',['We use authentication, RBAC, organization isolation, database access rules, audit records and HTTPS/TLS controls.','No system is risk-free, so we maintain prevention, detection and remediation controls.']],
      ['8. Your rights',['You may request access, correction, applicable portability, consent withdrawal and deletion where provided by applicable law. Contact '+CONTACT+'.']],
      ['9. Children',['NestAffiliate is a commercial operations tool and is not directed to children.']],
      ['10. Updates',['We may update this Policy as the product, integrations or legal requirements change. The current version date remains shown on this page.']],
      ['11. Pinterest API-specific data restrictions',['MillionsNest operates NestAffiliate. Contact: '+CONTACT+'. This is not an official Pinterest product; we do not claim active Pinterest API approval.','If approved, account data is accessed only with account-owner authorization and used to provide that users requested service. Pinterest API materials will not be retained except for explicit permitted exceptions, such as expressly authorized campaign analytics.','We do not sell or disclose Pinterest data to other advertising networks, use Pinterest materials to train/improve AI models, or offer Pinterest platform/competitor benchmarks without written authorization.','Users must have rights to uploaded content, select each publishing action and respect affiliate disclosure, originality and anti-spam rules.']]
    ]},
    terms:{title:'Terms of Use',intro:'These Terms govern use of NestAffiliate, a MillionsNest ecosystem tool for affiliate operations with mandatory human review.',sections:[
      ['1. Service use',['Use NestAffiliate lawfully and in compliance with platform rules, affiliate program terms and applicable law.','You are responsible for external accounts you connect, permissions you grant and information you provide manually.']],
      ['2. Human approval',['NestAffiliate does not replace human publishing decisions. Campaigns must be reviewed and approved before publication.','Automation does not remove your responsibility to verify product, link, availability, disclosure and publishing suitability.']],
      ['3. Commercial facts and AI',['AI must not invent price, stock, commission, ratings, reputation or other commercial facts.','The system separates Product Truth from Creative Narrative and may block publication when minimum safety or truth conditions are not met.']],
      ['4. Affiliate disclosure',['You must comply with each affiliate program and clearly identify commercial/affiliate content where required.','Commission, eligibility, tracking and payments are determined by affiliate platforms, not NestAffiliate.']],
      ['5. Third parties',['Pinterest, Mercado Livre, Shopee, Google and other connected services have their own terms, policies, limits and availability.','Third-party changes may affect individual features without disabling the rest of NestAffiliate.']],
      ['6. Prohibited use',['Do not use the service for spam, metric manipulation, fraud, copyright infringement, improper data collection, credential misuse or illegal content.','Do not bypass access controls, platform limits, Publishing Guard, tenant rules or security mechanisms.']],
      ['7. Availability and changes',['The product may evolve or adjust integrations in response to technical, security or policy requirements.','Features that depend on external approval may remain disabled until access is granted by the relevant platform.']],
      ['8. Results',['Marketing, sales, reach, commission and revenue are not guaranteed. Results depend on market, platform, product, audience, execution and external factors.']],
      ['9. Contact',['Questions about these Terms can be sent to '+CONTACT+'.']],
      ['10. Pinterest-specific rules',['Users must select each Pin before submission. Bulk affiliate spam, automated engagement, scraping, circumvention of API limits or consent, and account misuse are prohibited.','Do not train AI on Pinterest materials or provide Pinterest competitor/platform benchmarks without written permission. You need rights to all uploaded media, and affiliate links must be clearly disclosed.']]
    ]},
    'data-deletion':{title:'Data Deletion and Unlinking',intro:'Use these instructions to request deletion of NestAffiliate data or revoke an external integration.',sections:[
      ['1. Disconnect a platform',['Revoke authorization in the connected platform settings when available.','Then request removal of remaining NestAffiliate connection tokens/data.']],
      ['2. Request deletion',['Email '+CONTACT+' with subject “Data deletion — NestAffiliate”.','Include the account email and organization if known. Never send a password, token, secret or authentication code.','We verify requests to prevent unauthorized deletion. Eligible data is deleted or anonymized subject to legal, fraud-prevention, security and required-record retention.']],
      ['3. Data covered',['Operational profile, preferences, campaigns, versions, publications, results, integrations and associated user/organization data depending on the request and permissions.']],
      ['4. External platforms',['Deleting NestAffiliate data does not automatically delete Pins, products, history or data retained by Pinterest, Mercado Livre, Shopee, Google or other platforms. Manage those directly with each provider.']]
    ]}
  };

  const es:LegalLocaleCopy={
    privacy:{title:'Política de Privacidad',intro:'Esta Política explica cómo NestAffiliate, producto del ecosistema MillionsNest, trata datos al ofrecer inteligencia de afiliados, creación de campañas, publicación asistida y análisis de rendimiento.',sections:[
      ['1. Datos tratados',['Datos de cuenta e identidad necesarios para autenticación, como nombre, correo, identificadores Firebase/Google y organización activa.','Datos operativos del workspace: campañas, productos, links de afiliado, aprobaciones, preferencias, publicaciones, métricas y auditoría.','Datos de integraciones externas solo cuando conectas o autorizas una plataforma, incluidos identificadores, permisos y tokens necesarios. Secretos y tokens no deben exponerse en el navegador ni en documentos públicos.','Datos técnicos esenciales de seguridad y funcionamiento.']],
      ['2. Uso de los datos',['Autenticar usuarios y aplicar permisos.','Crear, revisar, versionar, aprobar y medir campañas.','Validar Product Truth, compliance, disponibilidad, links y prevención de duplicación/spam.','Generar análisis y aprendizaje sin permitir que IA reemplace hechos comerciales.','Mantener seguridad, auditoría, estabilidad y soporte.']],
      ['3. Principios',['Tratamos datos para prestar el servicio, cumplir obligaciones aplicables, intereses operativos/seguridad compatibles y consentimiento cuando sea necesario.','Aplicamos finalidad, minimización, transparencia, seguridad y aislamiento por organización.']],
      ['4. Compartición',['Podemos usar proveedores necesarios de infraestructura/autenticación, incluidos Firebase/Google Cloud.','Con tu autorización, datos estrictamente necesarios pueden intercambiarse con Pinterest, Mercado Livre o Shopee según permisos y términos.','No vendemos datos personales a anunciantes.']],
      ['5. Pinterest e integraciones',['La API de Pinterest aún no está conectada: el Trial de la app 1625057 fue denegado el 20/10/2026 y requiere nueva evaluación. Después de su aprobación, la conexión utilizará OAuth con permisos autorizados por el titular.','NestAffiliate no solicita tu contraseña de Pinterest ni debe almacenar cookies de sesión.','Puedes revocar acceso en la plataforma conectada o solicitar desvinculación.']],
      ['6. Retención y eliminación',['Conservamos datos mientras sean necesarios para prestar el servicio, seguridad/auditoría y obligaciones aplicables.','Los datos elegibles serán eliminados o anonimizados ante una solicitud válida cuando no exista obligación legítima de retención.','Instrucciones en /data-deletion.']],
      ['7. Seguridad',['Usamos autenticación, RBAC, aislamiento por organización, reglas de acceso, auditoría y HTTPS/TLS.','Ningún sistema está libre de riesgo; mantenemos controles preventivos, de detección y corrección.']],
      ['8. Tus derechos',['Puedes solicitar acceso, corrección, portabilidad cuando corresponda, revocación del consentimiento y eliminación según la ley aplicable. Contacto: '+CONTACT+'.']],
      ['9. Menores',['NestAffiliate es una herramienta comercial y no está dirigida a niños.']],
      ['10. Actualizaciones',['Podemos actualizar esta Política cuando cambie el producto, las integraciones o los requisitos legales.']],
      ['11. Limitaciones específicas de la API de Pinterest',['MillionsNest es la marca operadora de NestAffiliate. Contacto: '+CONTACT+'. No somos una app oficial de Pinterest ni afirmamos tener acceso activo a su API.','Tras la autorización del titular, los datos solo se usan para los servicios solicitados. No conservamos información obtenida por la API salvo excepciones permitidas, como analíticas de campañas expresamente autorizadas.','No vendemos datos de Pinterest a redes publicitarias ni usamos su contenido para entrenar IA; no ofrecemos comparativas de competidores sin permiso escrito.','Cada publicación requiere selección del usuario y cumplimiento de reglas de derechos, enlaces de afiliados y prevención de spam.']]
    ]},
    terms:{title:'Términos de Uso',intro:'Estos Términos regulan el uso de NestAffiliate, herramienta del ecosistema MillionsNest para operación de afiliados con revisión humana obligatoria.',sections:[
      ['1. Uso',['Usa NestAffiliate legalmente y según reglas de plataformas, programas de afiliados y legislación aplicable.','Eres responsable de cuentas externas, permisos y datos que ingresas manualmente.']],
      ['2. Aprobación humana',['NestAffiliate no reemplaza la decisión humana de publicar. Las campañas deben revisarse y aprobarse antes de publicación.','La automatización no elimina tu responsabilidad de verificar producto, link, disponibilidad y disclosure.']],
      ['3. Hechos comerciales e IA',['IA no debe inventar precio, stock, comisión, rating, reputación u otros hechos comerciales.','El sistema separa Product Truth de Creative Narrative y puede bloquear publicaciones inseguras.']],
      ['4. Afiliados',['Debes cumplir cada programa de afiliados e identificar contenido comercial/afiliado cuando corresponda.','Comisiones, tracking y pagos dependen de las plataformas, no de NestAffiliate.']],
      ['5. Terceros',['Pinterest, Mercado Livre, Shopee, Google y otros servicios tienen sus propios términos, políticas, límites y disponibilidad.']],
      ['6. Prohibiciones',['No uses el servicio para spam, fraude, manipulación de métricas, violación de derechos, recolección indebida, robo de credenciales o contenido ilegal.','No eludas controles de acceso, límites, Publishing Guard o seguridad.']],
      ['7. Cambios',['El producto puede evolucionar y adaptar integraciones por requisitos técnicos, de seguridad o políticas externas.']],
      ['8. Resultados',['No se garantizan ventas, alcance, comisión o ingresos. Los resultados dependen del mercado y factores externos.']],
      ['9. Contacto',['Consultas: '+CONTACT+'.']],
      ['10. Reglas para Pinterest',['Cada Pin debe ser seleccionado por el usuario antes de su envío. Están prohibidos el spam masivo de afiliación, scraping, manipulación del engagement y eludir consentimiento o límites de API.','No se permite usar materiales de Pinterest para entrenar IA ni publicar análisis de competidores sin permiso escrito. Se necesitan derechos sobre contenido y divulgación clara de enlaces comerciales.']]
    ]},
    'data-deletion':{title:'Eliminación de Datos y Desvinculación',intro:'Usa estas instrucciones para solicitar eliminación de datos de NestAffiliate o revocar una integración.',sections:[
      ['1. Desconectar',['Revoca autorización directamente en la plataforma conectada cuando esté disponible.','Después solicita eliminación de tokens/datos remanentes en NestAffiliate.']],
      ['2. Solicitar eliminación',['Envía correo a '+CONTACT+' con asunto “Eliminación de datos — NestAffiliate”.','Incluye el correo de la cuenta y organización si la conoces. Nunca envíes contraseña, token, secreto o código de autenticación.','Verificamos solicitudes para prevenir eliminaciones no autorizadas.']],
      ['3. Datos cubiertos',['Perfil operativo, preferencias, campañas, versiones, publicaciones, resultados e integraciones según la solicitud y permisos.']],
      ['4. Plataformas externas',['Eliminar datos de NestAffiliate no elimina automáticamente Pins o datos guardados por Pinterest, Mercado Livre, Shopee, Google u otros proveedores.']]
    ]}
  };

  const source=locale==='en'?en:locale==='es'?es:pt;
  return source[kind];
}

export function PublicLegalPage({kind}:{kind:LegalKind}){
  const [locale,setLocale]=useState<Locale>(()=>{
    const stored=localStorage.getItem('na_locale');
    if(stored==='en'||stored==='es'||stored==='pt-BR') return stored;
    return navigator.language.toLowerCase().startsWith('es')?'es':navigator.language.toLowerCase().startsWith('en')?'en':'pt-BR';
  });
  const copy=useMemo(()=>legalCopy(locale,kind),[locale,kind]);

  useEffect(()=>{
    localStorage.setItem('na_locale',locale);
    document.title=copy.title+' · NestAffiliate';
  },[locale,copy.title]);

  return <main className="legal-shell">
    <header className="legal-topbar">
      <a className="brand legal-brand" href="/"><img className="brand-symbol" src="/icon.svg?v=2" alt=""/><span className="brand-wordmark"><span>Nest</span>Affiliate</span></a>
      <div className="legal-languages" aria-label="Language">
        {(['pt-BR','en','es'] as Locale[]).map((item)=><button key={item} className={locale===item?'active':''} onClick={()=>setLocale(item)}>{item==='pt-BR'?'PT':item.toUpperCase()}</button>)}
      </div>
    </header>
    <article className="legal-document">
      <p className="eyebrow">MILLIONSNEST · NESTAFFILIATE</p>
      <h1>{copy.title}</h1>
      <p className="legal-updated">{locale==='pt-BR'?'Atualizado em':locale==='es'?'Actualizado el':'Updated'} {UPDATED}</p>
      <p className="legal-intro">{copy.intro}</p>
      {copy.sections.map(([title,paragraphs])=><section key={title}>
        <h2>{title}</h2>
        {paragraphs.map((paragraph)=><p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <footer className="legal-footer">
        <div><strong>NestAffiliate</strong><span>Affiliate Intelligence by MillionsNest</span></div>
        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/data-deletion">Data deletion</a>
          <a href={SITE}>App</a>
          <a href={'mailto:'+CONTACT}>{CONTACT}</a>
        </nav>
      </footer>
    </article>
  </main>;
}
