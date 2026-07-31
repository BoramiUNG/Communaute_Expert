// ==========================================================================
// LineUp7 Guild Hub v2 — Application Engine
// Frontend-only (localStorage). All data access goes through the Store module
// so a real backend can later replace it with minimal changes.
// ==========================================================================

(function () {
    'use strict';

    // ======================================================================
    // 0. Utilities
    // ======================================================================
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function uid(prefix) {
        return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function todayFr() {
        return new Date().toLocaleDateString('fr-FR');
    }

    function avatarFromName(name) {
        const parts = name.split(/[.\s]+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    const prefersReducedMotion = () =>
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function timeAgo(ts) {
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 45) return "à l'instant";
        const m = Math.floor(s / 60);
        if (m < 60) return `il y a ${m} min`;
        const h = Math.floor(m / 60);
        if (h < 24) return `il y a ${h} h`;
        const d = Math.floor(h / 24);
        if (d < 7) return `il y a ${d} j`;
        return new Date(ts).toLocaleDateString('fr-FR');
    }

    // Animated number counter (respects reduced-motion)
    function animateCounter(el, target, opts = {}) {
        if (!el) return;
        const suffix = opts.suffix || '';
        const fmt = (v) => v.toLocaleString('fr-FR') + suffix;
        if (prefersReducedMotion()) { el.textContent = fmt(target); return; }
        const dur = opts.dur || 900;
        const from = 0;
        const start = performance.now();
        function tick(now) {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = fmt(Math.round(from + (target - from) * eased));
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // Lightweight confetti burst (badge unlocks)
    function confettiBurst() {
        if (prefersReducedMotion()) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const colors = ['#32ac5c', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#43c470'];
        const parts = Array.from({ length: 130 }, () => ({
            x: canvas.width / 2 + (Math.random() - 0.5) * 260,
            y: canvas.height * 0.28 + (Math.random() - 0.5) * 60,
            r: 4 + Math.random() * 6,
            c: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 9,
            vy: -4 - Math.random() * 8,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.4
        }));
        let frame = 0;
        (function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            parts.forEach((p) => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.rot += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.c;
                ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.62);
                ctx.restore();
            });
            frame++;
            if (frame < 170) requestAnimationFrame(draw);
            else canvas.remove();
        })();
    }

    // ======================================================================
    // Feed — unified events store (activity feed + notifications), persisted
    // ======================================================================
    const Feed = (function () {
        const KEY = 'lineup7_v2_feed';
        function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
        function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
        let events = read();
        if (!events.length) {
            const now = Date.now();
            events = [
                { id: uid('ev'), type: 'badge', title: 'Nouveau badge disponible', msg: 'Débloquez « Premiers Pas » en déclarant une compétence.', ts: now - 1000 * 60 * 30, read: false },
                { id: uid('ev'), type: 'clinique', title: 'Clinique Tech', msg: '3 cas ouverts attendent un Helper.', ts: now - 1000 * 60 * 90, read: false },
                { id: uid('ev'), type: 'xp', title: 'Bienvenue sur le Guild Hub', msg: 'Explorez le Skill Tree, la Matrice et le Vault ✨', ts: now - 1000 * 60 * 60 * 3, read: true }
            ];
            write(events);
        }
        return {
            push(type, title, msg, opts = {}) {
                const ev = { id: uid('ev'), type, title, msg, ts: Date.now(), read: !!opts.read };
                events.unshift(ev);
                if (events.length > 60) events = events.slice(0, 60);
                write(events);
                return ev;
            },
            all() { return events; },
            unread() { return events.filter((e) => !e.read).length; },
            markAllRead() { events.forEach((e) => { e.read = true; }); write(events); }
        };
    })();

    // ======================================================================
    // 1. Toast notifications (replaces alert())
    // ======================================================================
    const Toast = (function () {
        let container = null;
        function ensure() {
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                container.setAttribute('aria-live', 'polite');
                document.body.appendChild(container);
            }
            return container;
        }
        function show(message, type = 'info', opts = {}) {
            const icons = {
                info: 'fa-circle-info',
                success: 'fa-circle-check',
                warning: 'fa-triangle-exclamation',
                error: 'fa-circle-xmark',
                badge: 'fa-award',
                xp: 'fa-bolt'
            };
            const el = document.createElement('div');
            el.className = `toast toast-${type}`;
            el.setAttribute('role', 'status');
            el.innerHTML = `
                <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
                <div class="toast-body">
                    ${opts.title ? `<span class="toast-title">${escapeHtml(opts.title)}</span>` : ''}
                    <span class="toast-msg">${message}</span>
                </div>
                <button class="toast-close" aria-label="Fermer">&times;</button>`;
            ensure().appendChild(el);
            requestAnimationFrame(() => el.classList.add('show'));
            const dismiss = () => {
                el.classList.remove('show');
                setTimeout(() => el.remove(), 300);
            };
            el.querySelector('.toast-close').addEventListener('click', dismiss);
            setTimeout(dismiss, opts.duration || 4200);
        }
        return {
            info: (m, o) => show(m, 'info', o),
            success: (m, o) => show(m, 'success', o),
            warning: (m, o) => show(m, 'warning', o),
            error: (m, o) => show(m, 'error', o),
            badge: (m, o) => show(m, 'badge', { duration: 6000, ...o }),
            xp: (m, o) => show(m, 'xp', o)
        };
    })();

    // Lightweight confirm dialog (promise-based) for destructive actions
    function confirmDialog(message, { confirmLabel = 'Confirmer', danger = true } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal active confirm-modal';
            overlay.innerHTML = `
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-gold);"></i> Confirmation</h3>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">${message}</p>
                    <div class="modal-footer">
                        <button class="btn btn-outline" data-act="cancel">Annuler</button>
                        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmLabel}</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const close = (val) => { overlay.remove(); resolve(val); };
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
                if (e.target.closest('[data-act="cancel"]')) close(false);
                if (e.target.closest('[data-act="ok"]')) close(true);
            });
        });
    }

    // ======================================================================
    // 2. Store — single source of truth (localStorage backed)
    // ======================================================================
    const Store = (function () {
        const KEYS = {
            users: 'lineup7_v2_users',
            current: 'lineup7_v2_current',
            articles: 'lineup7_v2_articles',
            snippets: 'lineup7_v2_snippets'
        };

        const DEFAULT_STATS = { snippets: 0, articles: 0, incidentsHelped: 0, loopDocs: 0 };

        const seedUsers = [
            { id: 'elian-m', name: 'Elian.M', role: 'Practice Lead & Mentor', avatar: 'EM', xp: 1450, joinedAt: '2025-01-10',
              skills: { 'sfmc-ampscript': 'Expert', 'sfmc-ssjs-sql': 'Expert', 'sfmc-deliverability': 'Expert', 'sfmc-next-flows': 'Expert', 'sf-datacloud-dmo': 'Expert', 'sf-datacloud-insights': 'Expert', 'agentforce-ia': 'Expert', 'agentforce-mcp': 'Expert', 'gcp-bigquery': 'Expert', 'snowflake-data': 'Expert', 'martech-audit': 'Expert' },
              stats: { snippets: 3, articles: 1, incidentsHelped: 4, loopDocs: 2 } },
            { id: 'hugo-s', name: 'Hugo.S', role: 'Data & Cloud Architect', avatar: 'HS', xp: 1120, joinedAt: '2025-02-15',
              skills: { 'gcp-bigquery': 'Expert', 'snowflake-data': 'Expert', 'dbt-modeling': 'Expert', 'airflow-pipelines': 'Expert', 'sf-datacloud-insights': 'Expert', 'agentforce-mcp': 'Confirmé', 'martech-audit': 'Expert' },
              stats: { snippets: 2, articles: 1, incidentsHelped: 3, loopDocs: 1 } },
            { id: 'yassine-k', name: 'Yassine.K', role: 'Salesforce & Data Specialist', avatar: 'YK', xp: 980, joinedAt: '2025-03-01',
              skills: { 'sf-datacloud-dmo': 'Expert', 'sf-datacloud-insights': 'Expert', 'sfmc-next-flows': 'Confirmé', 'gcp-bigquery': 'Confirmé', 'dbt-modeling': 'Confirmé', 'agentforce-mcp': 'Confirmé', 'martech-audit': 'Confirmé' },
              stats: { snippets: 1, articles: 1, incidentsHelped: 2, loopDocs: 1 } },
            { id: 'lucas-a', name: 'Lucas.A', role: 'MarTech Lead Consultant', avatar: 'LA', xp: 850, joinedAt: '2025-03-20',
              skills: { 'sfmc-ampscript': 'Expert', 'sfmc-ssjs-sql': 'Expert', 'sfmc-deliverability': 'Expert', 'sfmc-next-flows': 'Confirmé', 'sf-datacloud-dmo': 'Confirmé', 'imagino-cdp': 'Confirmé' },
              stats: { snippets: 1, articles: 1, incidentsHelped: 3, loopDocs: 0 } },
            { id: 'borami-u', name: 'Borami.U', role: 'CDP & Imagino Expert', avatar: 'BU', xp: 780, joinedAt: '2025-04-05',
              skills: { 'imagino-cdp': 'Expert', 'imagino-campaign': 'Expert', 'sfmc-ampscript': 'Confirmé', 'sfmc-deliverability': 'Confirmé' },
              stats: { snippets: 0, articles: 1, incidentsHelped: 1, loopDocs: 1 } },
            { id: 'yousra-b', name: 'Yousra.B', role: 'MarTech & Campaign Specialist', avatar: 'YB', xp: 720, joinedAt: '2025-04-18',
              skills: { 'sfmc-ampscript': 'Confirmé', 'sfmc-deliverability': 'Expert', 'imagino-campaign': 'Expert', 'imagino-cdp': 'Confirmé' },
              stats: { snippets: 0, articles: 0, incidentsHelped: 1, loopDocs: 1 } }
        ];

        const seedArticles = [
            { id: 'art-mcp-2026', title: "Pourquoi le Model Context Protocol (MCP) redéfinit l'architecture MarTech en 2026",
              author: 'Elian.M', authorAvatar: 'EM', date: '30/07/2026', readTime: '4 min',
              tags: '#Agentforce #MCP #MarTech #Salesforce', category: 'Agentforce',
              summary: "Comment la suppression des intégrations N x M au profit de serveurs MCP gouvernés permet aux agents IA d'interroger le Customer 360 sans dette technique.",
              likes: 12, likedBy: [], reads: 87,
              content: `### 🤖 Pourquoi le Model Context Protocol (MCP) redéfinit l'architecture MarTech

Sur nos projets MarTech récents chez **LineUP7**, une problématique revient systématiquement : *comment donner à des agents IA (type Agentforce) un accès sécurisé et temps réel aux données clients sans multiplier les connecteurs ad-hoc ?*

C'est ici qu'intervient le **Model Context Protocol (MCP)**, le standard open-source adopté par Salesforce.

#### 💡 Les 3 piliers de l'architecture MCP chez LineUp7 :
- **Adieu la dette d'intégration N x M** : un serveur MCP expose des "Tools" standardisés que tout LLM/Agent peut consommer.
- **Sécurité & Context Grounding** : l'agent IA n'hallucine plus, il interroge Data Cloud ou Snowflake sous contrôle strict.
- **Découplage Front/Back** : nos équipes branchent un serveur MCP Node.js ou Python en quelques heures.

---
🚀 *Vous déployez Agentforce ou Data Cloud dans votre organisation ? Parlons-en en commentaire !*

#LineUp7 #MarTech #Agentforce #Salesforce #MCP #DataCloud #AI` },
            { id: 'art-datacloud-zero-copy', title: "Salesforce Data Cloud : réussir l'Identity Resolution sans dupliquer vos données (Zero-Copy)",
              author: 'Yassine.K', authorAvatar: 'YK', date: '28/07/2026', readTime: '5 min',
              tags: '#DataCloud #Snowflake #GCP #ZeroCopy', category: 'DataCloud',
              summary: "Analyse d'une architecture Zero-Copy Federated Grounding entre BigQuery, Snowflake et Salesforce Data Cloud.",
              likes: 8, likedBy: [], reads: 63,
              content: `### ⚡ Identity Resolution & Zero-Copy : la nouvelle norme Data Cloud

Pourquoi dupliquer des gigaoctets de données de votre Data Warehouse (BigQuery / Snowflake) vers votre CDP quand vous pouvez utiliser le **Zero-Copy Data Sharing** ?

#### 🔑 Retour d'expérience de l'équipe Data LineUp7 :
- **Federated Grounding** : Data Cloud interroge directement les tables externes Snowflake sans pipeline ETL lourd.
- **Match Rules d'Identity Resolution** : réconciliation omnicanale basée sur les identifiants unifiés.
- **Réduction de 40% des coûts d'ingestion** : moins de volumes transférés = facture Cloud réduite.

---
💡 *Une question sur la modélisation DMO/DSO ? L'équipe MarTech & Data LineUp7 est à votre disposition.*

#DataCloud #Snowflake #BigQuery #IdentityResolution #LineUp7` },
            { id: 'art-imagino-vs-sf', title: 'Imagino CDP vs Salesforce Data Cloud : quel moteur choisir selon la maturité client ?',
              author: 'Borami.U', authorAvatar: 'BU', date: '20/07/2026', readTime: '3 min',
              tags: '#Imagino #CDP #MarTech #Architecture', category: 'Imagino',
              summary: "Comparatif pragmatique des cas d'usage : quand privilégier une CDP Pure-Play agile comme Imagino face à un géant comme Data Cloud.",
              likes: 5, likedBy: [], reads: 41,
              content: `### 🎯 Imagino CDP vs Salesforce Data Cloud : le bon choix d'architecture

Toutes les entreprises n'ont pas besoin du même niveau de complexité pour unifier leur profil client 360.

#### 📊 Le comparatif terrain LineUp7 :
- **Imagino CDP** : idéal pour une agilité extrême et une mise en production rapide (Time-to-Market < 2 mois).
- **Salesforce Data Cloud** : incontournable pour les écosystèmes complexes multi-BU intégrés à Salesforce Core.

---
🤝 *Besoin d'un cadrage neutre sur le choix de votre CDP ? Contactez nos experts chez LineUp7 !*

#Imagino #CDP #MarTech #LineUp7 #Salesforce` }
        ];

        const seedSnippets = [
            { id: 'snip-ampscript', category: 'SFMC', authorId: 'elian-m', title: 'AMPscript Lookup & Dynamic Header Personalization',
              desc: "Scripting d'emailing dynamique sécurisé avec fallback automatique si l'attribut prénom/profil est absent.",
              code: `%%[
VAR @subscriberKey, @firstName, @tier, @rows, @rowCount
SET @subscriberKey = AttributeValue("_subscriberkey")
SET @firstName = AttributeValue("FirstName")
IF EMPTY(@firstName) THEN SET @firstName = "Client Privilégié" ENDIF

SET @rows = LookupRows("DE_Customer_Loyalty_LineUp7", "SubscriberKey", @subscriberKey)
SET @rowCount = RowCount(@rows)
IF @rowCount > 0 THEN
    SET @tier = Field(Row(@rows, 1), "LoyaltyTier")
ELSE
    SET @tier = "Standard"
ENDIF
]%%
Bonjour %%=v(@firstName)=%%, votre statut est %%=v(@tier)=%%.` },
            { id: 'snip-insights', category: 'DataCloud', authorId: 'yassine-k', title: 'Calculated Insight Data Cloud (Score RFM & Recency)',
              desc: "Calculated Insight SQL dans Salesforce Data Cloud pour calculer le montant total dépensé et la récence d'achat.",
              code: `SELECT
    Individual__dlm.Id__c AS CustomerId__c,
    MAX(SalesOrder__dlm.PurchaseDate__c) AS LastPurchaseDate__c,
    SUM(SalesOrder__dlm.GrandTotalAmount__c) AS TotalLifetimeValue__c,
    COUNT(SalesOrder__dlm.Id__c) AS TotalOrderCount__c
FROM Individual__dlm
JOIN SalesOrder__dlm ON Individual__dlm.Id__c = SalesOrder__dlm.CustomerId__c
GROUP BY Individual__dlm.Id__c` },
            { id: 'snip-mcp', category: 'MCP', authorId: 'elian-m', title: 'Serveur MCP Node.js (Boilerplate Agentforce)',
              desc: 'Template minimal pour exposer un endpoint MCP sécurisé connecté aux APIs Salesforce ou Snowflake.',
              code: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "lineup7-mcp-agent", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "query_customer_cdp",
    description: "Interroger le profil client 360 dans Salesforce Data Cloud / Snowflake",
    inputSchema: { type: "object", properties: { email: { type: "string" } } }
  }]
}));` },
            { id: 'snip-sfmc', category: 'SFMC', authorId: 'lucas-a', title: 'Script SSJS Purge Data Extension SFMC',
              desc: "Script SSJS générique pour purger les lignes d'une DE temporaire sans impacter l'Automation Studio.",
              code: `<script runat="server">
Platform.Load("Core", "1.1.1");
var deName = "DE_Audience_Temp_LineUp7";
var api = DataExtension.Init(deName);
var status = api.Rows.Clear();
Write("Purge terminée avec succès.");
</script>` },
            { id: 'snip-bq', category: 'GCP', authorId: 'hugo-s', title: 'Requête BigQuery SQL Optimisée (Partition & Clustered)',
              desc: "Requête d'export d'audiences volumineuses filtrée sur les 30 derniers jours avec zéro surcoût de scan.",
              code: `SELECT customer_id, email, SUM(order_amount) AS total_spent
FROM \`lineup7_data_warehouse.orders\`
WHERE _PARTITIONDATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY customer_id, email
HAVING total_spent > 150
ORDER BY total_spent DESC;` },
            { id: 'snip-dbt', category: 'dbt', authorId: 'hugo-s', title: 'Modèle dbt Incrémental Imagino ➔ BigQuery',
              desc: 'Transformation Jinja SQL incrémentale pour dédupliquer les profils clients unifiés.',
              code: `{{ config(materialized='incremental', unique_key='customer_id') }}

SELECT customer_id, email, updated_at
FROM {{ ref('stg_imagino_users') }}
{% if is_incremental() %}
  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}` }
        ];

        function read(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) {
                return fallback;
            }
        }
        function write(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
        }

        // --- Load & migrate ---
        let users = read(KEYS.users, null);
        // Migration guard: reset if legacy/empty schema detected
        if (!Array.isArray(users) || users.length === 0 || !users[0].skills || !users[0].stats) {
            users = seedUsers;
            write(KEYS.users, users);
        }
        // Ensure every user has a stats object (forward-compat)
        users.forEach(u => { u.stats = Object.assign({}, DEFAULT_STATS, u.stats); if (!u.joinedAt) u.joinedAt = '2025-01-01'; });

        let articles = read(KEYS.articles, null);
        if (!Array.isArray(articles) || articles.length === 0) { articles = seedArticles; write(KEYS.articles, articles); }
        articles.forEach(a => { if (typeof a.likes !== 'number') a.likes = 0; if (!Array.isArray(a.likedBy)) a.likedBy = []; if (typeof a.reads !== 'number') a.reads = 0; if (!a.category) a.category = (a.tags || '#Autre').split(' ')[0].replace('#', ''); });

        let snippets = read(KEYS.snippets, null);
        if (!Array.isArray(snippets) || snippets.length === 0) { snippets = seedSnippets; write(KEYS.snippets, snippets); }

        let currentUserId = read(KEYS.current, null) || 'elian-m';

        return {
            // Users
            getUsers: () => users,
            getUser: (id) => users.find(u => u.id === id),
            getCurrentUser: () => users.find(u => u.id === currentUserId) || users[0],
            setCurrentUser: (id) => { currentUserId = id; write(KEYS.current, id); },
            getCurrentUserId: () => currentUserId,
            addUser: (user) => { users.push(user); write(KEYS.users, users); },
            saveUsers: () => write(KEYS.users, users),
            level: (user) => Math.max(1, Math.floor(user.xp / 100)),
            // Articles
            getArticles: () => articles,
            saveArticles: () => write(KEYS.articles, articles),
            addArticle: (a) => { articles.unshift(a); write(KEYS.articles, articles); },
            removeArticle: (id) => { articles = articles.filter(a => a.id !== id); write(KEYS.articles, articles); },
            // Snippets
            getSnippets: () => snippets,
            saveSnippets: () => write(KEYS.snippets, snippets),
            addSnippet: (s) => { snippets.unshift(s); write(KEYS.snippets, snippets); },
            DEFAULT_STATS
        };
    })();

    // ======================================================================
    // 3. Domain metadata (skills, pillars, node details)
    // ======================================================================
    const PILLARS = {
        salesforce: ['sfmc-ampscript', 'sfmc-ssjs-sql', 'sfmc-deliverability', 'sfmc-next-flows', 'sf-datacloud-dmo', 'sf-datacloud-insights', 'agentforce-ia', 'agentforce-mcp'],
        imagino: ['imagino-cdp', 'imagino-campaign'],
        cloudData: ['gcp-bigquery', 'snowflake-data'],
        dataEng: ['dbt-modeling', 'airflow-pipelines']
    };

    function skillCount(user) { return Object.keys(user.skills).length; }
    function expertCount(user) { return Object.values(user.skills).filter(v => v === 'Expert').length; }
    function pillarsCovered(user) {
        return Object.entries(PILLARS).filter(([, keys]) => keys.some(k => user.skills[k])).length;
    }

    const nodeDetails = {
        'sfmc-core': { title: 'Marketing Cloud Engagement & AMPscript', desc: 'SQL Data Views, SSJS, Automation Studio, AMPscript & Délivrabilité', blueprints: ['LineUp7_SFMC_Audit_Checklist.pdf', 'SSJS_DataExtension_Cleanup_Snippet.js', 'LineUp7_AMPscript_CheatSheet.pdf'] },
        'sf-datacloud': { title: 'Salesforce Data Cloud & Insights', desc: 'DMO/DSO Modeling, Ingestion Streams, Calculated Insights, Identity Resolution', blueprints: ['DataCloud_DMO_Customer_Model_Template.drawio', 'Identity_Resolution_Rules_Guide.pdf', 'DataCloud_Calculated_Insights_RFM.sql'] },
        'agentforce-mcp': { title: 'Agentforce & Serveurs MCP', desc: "AI Agents autonomes, Model Context Protocol, Endpoints d'outils et connexions LLM", blueprints: ['MCP_Server_NodeJS_Boilerplate.zip', 'Agentforce_Prompt_Engineering_Rules.md'] },
        'imagino-cdp': { title: 'Imagino CDP & Golden Record', desc: 'Modélisation Data Client 360, Unification, déduplication & règles de Golden Record', blueprints: ['Imagino_GoldenRecord_Config_Recipe.json'] },
        'imagino-campaign': { title: 'Imagino Campaign & Triggers Temps Réel', desc: "Orchestration cross-canal, Triggers API temps réel et activation d'audiences", blueprints: ['Imagino_Campaign_Trigger_API_Spec.pdf'] },
        'gcp-bigquery': { title: 'GCP BigQuery & GCS MarTech', desc: 'Partitionnement, Ingestion GCS, Optimisation des coûts SQL BigQuery & Looker Studio', blueprints: ['BigQuery_Cost_Optimization_Checklist.md', 'GCS_Bucket_Sync_Script.sh'] },
        'snowflake-data': { title: 'Snowflake Data Cloud & Clean Rooms', desc: 'Zero-Copy Cloning, Secure Views, Data Clean Rooms et Data Sharing inter-entreprises', blueprints: ['Snowflake_ZeroCopy_Sharing_Recipe.sql'] },
        'dbt-modeling': { title: 'dbt (Data Build Tool) & Data Quality', desc: 'Transformations Jinja/SQL modulaires, Modèles incrémentaux & Data Quality Testing', blueprints: ['dbt_MarTech_Core_Project_Structure.zip'] },
        'airflow-pipelines': { title: 'Apache Airflow & Orchestration DAGs', desc: 'DAGs complexes, sync CRM/CDP, alertes Teams et retries automatiques', blueprints: ['Airflow_SFMC_Sync_DAG_Template.py'] },
        'sfmc-ampscript': { title: 'AMPscript & Personnalisation Dynamique SFMC', desc: "Scripting d'emails dynamiques, Lookups d'extensions, Content Blocks réutilisables & Fallbacks", blueprints: ['LineUp7_AMPscript_CheatSheet.pdf', 'Dynamic_Header_AMPscript_Template.html'] },
        'sfmc-ssjs-sql': { title: 'SSJS & SQL Data Views SFMC', desc: 'Automation Studio, Data Extensions temporaires, REST/SOAP APIs et scripts SSJS avancés', blueprints: ['SSJS_DataExtension_Cleanup_Snippet.js', 'SQL_DataViews_Query_Pack.sql'] },
        'sfmc-deliverability': { title: 'Délivrabilité & Configuration BU SFMC', desc: 'Sender Authentication Package (SAP), IP Warming, SPF/DKIM/DMARC & Inbox Placement', blueprints: ['LineUp7_IP_Warming_Plan_4Weeks.xlsx', 'Deliverability_Audit_Checklist.pdf'] },
        'sfmc-next-flows': { title: 'Marketing Cloud Next & Salesforce Flows', desc: 'Orchestration par Salesforce Flows, Triggered Sending, Event-Driven Marketing & Data Cloud Actions', blueprints: ['MC_Next_Flow_Orchestration_Pattern.pdf'] },
        'sf-datacloud-dmo': { title: 'Salesforce Data Cloud DMO & Identity', desc: 'Modélisation DMO/DSO, Data Ingestion Streams, règles de réconciliation & Match Rules Customer 360', blueprints: ['DataCloud_DMO_Customer_Model_Template.drawio', 'Identity_Resolution_Rules_Guide.pdf'] },
        'sf-datacloud-insights': { title: 'Calculated Insights & Data Transforms', desc: 'Calculated Insights SQL, Streaming Data Transforms, métriques LTV/RFM et agrégats temps réel', blueprints: ['DataCloud_Calculated_Insights_RFM_Recipes.sql'] },
        'agentforce-ia': { title: 'Agentforce IA & Guardrails', desc: 'Agents autonomes Salesforce, Prompts, Active Governance & Agentforce Command Center', blueprints: ['Agentforce_Prompt_Engineering_Rules.md'] },
        'martech-audit': { title: 'Audit Technique & Quality Gate LineUp7', desc: "Grille d'évaluation d'architecture MarTech, audit pré-livraison et conformité RGPD", blueprints: ['LineUp7_MarTech_Audit_QualityGate_Framework.xlsx'] }
    };

    // ======================================================================
    // 4. Badge system
    // ======================================================================
    // Each badge: id, name, icon, tier (bronze|silver|gold), desc, criteria(user),
    // and optional progress(user) => { current, target } for progress bars.
    const BADGES = [
        { id: 'founding-member', name: 'Membre Fondateur', icon: 'fa-flag', tier: 'gold', desc: 'Fait partie des membres historiques de la Guilde.',
          criteria: u => u.joinedAt < '2025-05-01' },
        { id: 'first-steps', name: 'Premiers Pas', icon: 'fa-shoe-prints', tier: 'bronze', desc: 'Déclarer sa première compétence.',
          criteria: u => skillCount(u) >= 1, progress: u => ({ current: Math.min(skillCount(u), 1), target: 1 }) },
        { id: 'polyglot', name: 'Polyvalent', icon: 'fa-layer-group', tier: 'silver', desc: 'Déclarer au moins 5 compétences.',
          criteria: u => skillCount(u) >= 5, progress: u => ({ current: Math.min(skillCount(u), 5), target: 5 }) },
        { id: 'expert-mind', name: 'Esprit Expert', icon: 'fa-brain', tier: 'gold', desc: 'Atteindre le niveau Expert sur 3 compétences.',
          criteria: u => expertCount(u) >= 3, progress: u => ({ current: Math.min(expertCount(u), 3), target: 3 }) },
        { id: 'full-stack', name: 'Full-Stack MarTech', icon: 'fa-cubes-stacked', tier: 'gold', desc: 'Couvrir les 4 piliers technologiques.',
          criteria: u => pillarsCovered(u) >= 4, progress: u => ({ current: pillarsCovered(u), target: 4 }) },
        { id: 'rising-star', name: 'Étoile Montante', icon: 'fa-star', tier: 'bronze', desc: 'Atteindre le niveau 5.',
          criteria: u => Store.level(u) >= 5, progress: u => ({ current: Math.min(Store.level(u), 5), target: 5 }) },
        { id: 'veteran', name: 'Vétéran de la Guilde', icon: 'fa-chess-king', tier: 'gold', desc: 'Atteindre le niveau 10.',
          criteria: u => Store.level(u) >= 10, progress: u => ({ current: Math.min(Store.level(u), 10), target: 10 }) },
        { id: 'contributor', name: 'Contributeur', icon: 'fa-code', tier: 'bronze', desc: 'Publier un snippet dans le Vault.',
          criteria: u => u.stats.snippets >= 1, progress: u => ({ current: Math.min(u.stats.snippets, 1), target: 1 }) },
        { id: 'code-master', name: 'Maître du Code', icon: 'fa-terminal', tier: 'silver', desc: 'Publier 3 snippets réutilisables.',
          criteria: u => u.stats.snippets >= 3, progress: u => ({ current: Math.min(u.stats.snippets, 3), target: 3 }) },
        { id: 'thought-leader', name: 'Thought Leader', icon: 'fa-linkedin', iconBrand: true, tier: 'silver', desc: 'Publier un article sur le Blog.',
          criteria: u => u.stats.articles >= 1, progress: u => ({ current: Math.min(u.stats.articles, 1), target: 1 }) },
        { id: 'prolific-writer', name: 'Plume Prolifique', icon: 'fa-feather-pointed', tier: 'gold', desc: 'Publier 3 articles.',
          criteria: u => u.stats.articles >= 3, progress: u => ({ current: Math.min(u.stats.articles, 3), target: 3 }) },
        { id: 'helping-hand', name: "Main Tendue", icon: 'fa-hand-holding-hand', tier: 'bronze', desc: 'Aider sur un cas de la Clinique Tech.',
          criteria: u => u.stats.incidentsHelped >= 1, progress: u => ({ current: Math.min(u.stats.incidentsHelped, 1), target: 1 }) },
        { id: 'firefighter', name: 'Pompier de Service', icon: 'fa-fire-extinguisher', tier: 'silver', desc: 'Aider sur 3 cas de la Clinique Tech.',
          criteria: u => u.stats.incidentsHelped >= 3, progress: u => ({ current: Math.min(u.stats.incidentsHelped, 3), target: 3 }) },
        { id: 'documentarian', name: 'Documentaliste', icon: 'fa-book', tier: 'silver', desc: 'Générer 2 fiches Loop au Master Index.',
          criteria: u => u.stats.loopDocs >= 2, progress: u => ({ current: Math.min(u.stats.loopDocs, 2), target: 2 }) }
    ];

    function earnedBadges(user) {
        return BADGES.filter(b => b.criteria(user));
    }

    // Detects newly-earned badges by comparing before/after snapshots and toasts them.
    function checkBadges(user, prevIds) {
        const nowIds = earnedBadges(user).map(b => b.id);
        const fresh = nowIds.filter(id => !prevIds.includes(id));
        if (fresh.length && user.id === Store.getCurrentUserId()) confettiBurst();
        fresh.forEach(id => {
            const b = BADGES.find(x => x.id === id);
            Toast.badge(`<strong>${b.name}</strong> — ${b.desc}`, { title: '🏆 Badge débloqué !' });
            Feed.push('badge', `Badge débloqué : ${b.name}`, b.desc, { read: false });
        });
        if (fresh.length) refreshFeedUI();
        return fresh;
    }

    // ======================================================================
    // 5. XP / rewards helper
    // ======================================================================
    function awardXp(user, amount, reason) {
        const prevBadges = earnedBadges(user).map(b => b.id);
        user.xp += amount;
        Store.saveUsers();
        renderHeaderUser();
        renderLeaderboard();
        if (amount > 0 && reason) {
            Toast.xp(`+${amount} XP — ${reason}`);
            Feed.push('xp', `+${amount} XP`, reason, { read: true });
            refreshFeedUI();
        }
        checkBadges(user, prevBadges);
        if ($('#tab-dashboard').classList.contains('active')) renderDashboard();
    }

    // ======================================================================
    // 6. Markdown renderer (safe: escapes first, then formats)
    // ======================================================================
    function renderMarkdown(md) {
        let html = escapeHtml(md);
        const codeBlocks = [];
        const inlineCodes = [];
        html = html.replace(/```([\s\S]*?)```/g, (m, c) => { codeBlocks.push(c.replace(/^\n+|\n+$/g, '')); return ` CB${codeBlocks.length - 1} `; });
        html = html.replace(/`([^`]+?)`/g, (m, c) => { inlineCodes.push(c); return ` IC${inlineCodes.length - 1} `; });

        html = html
            .replace(/^###### (.*)$/gm, '<h6 class="md-h6">$1</h6>')
            .replace(/^##### (.*)$/gm, '<h5 class="md-h5">$1</h5>')
            .replace(/^#### (.*)$/gm, '<h4 class="md-h4">$1</h4>')
            .replace(/^### (.*)$/gm, '<h3 class="md-h3">$1</h3>')
            .replace(/^## (.*)$/gm, '<h2 class="md-h2">$1</h2>')
            .replace(/^# (.*)$/gm, '<h1 class="md-h1">$1</h1>')
            .replace(/^\s*---\s*$/gm, '<hr class="md-hr">');

        // Grouped list items
        html = html.replace(/(?:^|\n)((?:[ \t]*[-*] .*(?:\n|$))+)/g, (m, block) => {
            const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[ \t]*[-*] /, '').trim()}</li>`).join('');
            return `\n<ul class="md-list">${items}</ul>`;
        });

        html = html
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Paragraphs
        html = html.split(/\n{2,}/).map(block => {
            const b = block.trim();
            if (!b) return '';
            if (/^<(h[1-6]|ul|pre|hr|blockquote)/.test(b) || /^ CB\d+ $/.test(b)) return b;
            return `<p>${b.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        html = html
            .replace(/ CB(\d+) /g, (m, i) => `<pre class="md-code"><code>${codeBlocks[i]}</code></pre>`)
            .replace(/ IC(\d+) /g, (m, i) => `<code class="md-inline">${inlineCodes[i]}</code>`);
        return html;
    }

    // ======================================================================
    // 7. Modal helpers
    // ======================================================================
    function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); }
    function closeModal(el) { el.classList.remove('active'); }
    function closeAllModals() { $$('.modal.active').forEach(m => m.classList.remove('active')); }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.closest('.close-modal')) {
            closeAllModals();
        } else if (e.target.classList.contains('modal') && e.target.classList.contains('active') && !e.target.classList.contains('confirm-modal')) {
            closeModal(e.target);
        }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

    // Generic declarative toast trigger: any element with data-toast="message"
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-toast]');
        if (el) { e.preventDefault(); Toast.info(escapeHtml(el.getAttribute('data-toast'))); }
    });

    // ======================================================================
    // 8. Tab navigation
    // ======================================================================
    function activateTab(tabId) {
        $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
        $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
        const shell = $('#app-shell');
        if (shell) shell.classList.remove('sidebar-open'); // close mobile drawer on nav
        if (tabId === 'dashboard') enterDashboard();
        if (tabId === 'analytics') enterAnalytics();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function initNav() {
        $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab'))));
        document.addEventListener('click', (e) => {
            const sw = e.target.closest('.switch-tab');
            if (sw) { e.preventDefault(); activateTab(sw.getAttribute('data-target')); }
        });
    }

    // ======================================================================
    // 8b. Sidebar (mobile drawer + desktop collapse, persisted)
    // ======================================================================
    function initSidebar() {
        const shell = $('#app-shell');
        const burger = $('#sidebar-toggle');
        const collapse = $('#sidebar-collapse');
        const scrim = $('#sidebar-scrim');
        if (burger) burger.addEventListener('click', () => shell.classList.toggle('sidebar-open'));
        if (scrim) scrim.addEventListener('click', () => shell.classList.remove('sidebar-open'));
        if (collapse) collapse.addEventListener('click', () => {
            shell.classList.toggle('sidebar-collapsed');
            try { localStorage.setItem('lineup7_v2_sidebar', shell.classList.contains('sidebar-collapsed') ? 'collapsed' : 'open'); } catch (e) {}
        });
        // Restore persisted collapse state (desktop only)
        try {
            if (localStorage.getItem('lineup7_v2_sidebar') === 'collapsed') shell.classList.add('sidebar-collapsed');
        } catch (e) {}
    }

    // ======================================================================
    // 8c. Theme toggle (light / dark, persisted)
    // ======================================================================
    function applyTheme(theme) {
        document.body.classList.toggle('theme-light', theme === 'light');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#eef2f8' : '#0f172a');
    }
    function initTheme() {
        const KEY = 'lineup7_v2_theme';
        let theme = 'dark';
        try { theme = localStorage.getItem(KEY) || 'dark'; } catch (e) {}
        applyTheme(theme);
        const btn = $('#theme-toggle');
        if (btn) btn.addEventListener('click', () => {
            theme = document.body.classList.contains('theme-light') ? 'dark' : 'light';
            applyTheme(theme);
            try { localStorage.setItem(KEY, theme); } catch (e) {}
            Toast.info(theme === 'light' ? 'Thème clair activé ☀️' : 'Thème sombre activé 🌙');
        });
    }

    // ======================================================================
    // 9. Header user + XP progress + dropdown switcher
    // ======================================================================
    function renderHeaderUser() {
        const user = Store.getCurrentUser();
        $('#current-user-avatar').textContent = user.avatar;
        $('#current-user-name').textContent = user.name;
        $('#current-user-role').textContent = user.role;
        const level = Store.level(user);
        const karma = $('#current-user-karma');
        if (karma) karma.innerHTML = `<i class="fa-solid fa-bolt"></i> Niv. ${level} · ${user.xp} XP`;

        // XP progress bar toward next level (each level = 100 XP)
        const bar = $('#xp-progress-fill');
        if (bar) {
            const pct = user.xp % 100;
            bar.style.width = pct + '%';
            const lbl = $('#xp-progress-label');
            if (lbl) lbl.textContent = `${pct}/100 vers niv. ${level + 1}`;
        }
    }

    function renderUserDropdown() {
        const list = $('#dropdown-users-list');
        if (!list) return;
        const currentId = Store.getCurrentUserId();
        list.innerHTML = '';
        Store.getUsers().forEach(user => {
            const item = document.createElement('div');
            item.className = `dropdown-user-item ${user.id === currentId ? 'active-user' : ''}`;
            item.innerHTML = `
                <div class="avatar-sm ${user.id === 'elian-m' ? 'primary' : ''}">${user.avatar}</div>
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <span style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(user.name)}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(user.role)}</span>
                </div>
                <span class="dd-badge-count" title="Badges">${earnedBadges(user).length} <i class="fa-solid fa-award"></i></span>`;
            item.addEventListener('click', () => {
                Store.setCurrentUser(user.id);
                renderAll();
                $('#user-switcher-container').classList.remove('open');
                Toast.info(`Profil actif : <strong>${escapeHtml(user.name)}</strong>`);
            });
            list.appendChild(item);
        });
    }

    function initUserSwitcher() {
        const container = $('#user-switcher-container');
        const trigger = $('#user-profile-trigger');
        if (trigger) trigger.addEventListener('click', (e) => { e.stopPropagation(); container.classList.toggle('open'); });
        document.addEventListener('click', (e) => { if (container && !container.contains(e.target)) container.classList.remove('open'); });
    }

    // ======================================================================
    // 10. Add user
    // ======================================================================
    function initAddUser() {
        const modal = $('#add-user-modal');
        const btn = $('#btn-open-add-user-modal');
        const form = $('#add-user-form');
        if (btn) btn.addEventListener('click', () => { $('#user-switcher-container').classList.remove('open'); openModal('add-user-modal'); });
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('#new-user-name').value.trim();
            const role = $('#new-user-role').value.trim();
            const rawSkills = $('#new-user-skills').value.trim();
            if (!name || !role) return;

            const newUser = {
                id: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).slice(2, 5),
                name, role, avatar: avatarFromName(name), xp: 100,
                joinedAt: new Date().toISOString().slice(0, 10),
                skills: {}, stats: Object.assign({}, Store.DEFAULT_STATS)
            };
            if (rawSkills) {
                rawSkills.split(',').forEach(s => {
                    const key = s.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                    if (key) newUser.skills[key] = 'Confirmé';
                });
            }
            Store.addUser(newUser);
            Store.setCurrentUser(newUser.id);
            renderAll();
            closeModal(modal);
            form.reset();
            Toast.success(`Bienvenue dans la Guilde, <strong>${escapeHtml(name)}</strong> !`);
        });
    }

    // ======================================================================
    // 11. Skill tree node inspector
    // ======================================================================
    function openNodeInspector(nodeId) {
        const data = nodeDetails[nodeId];
        if (!data) return;
        const activeUser = Store.getCurrentUser();
        const userLevelForSkill = activeUser.skills[nodeId] || 'Non déclarée';
        const members = Store.getUsers().filter(u =>
            u.skills[nodeId] ||
            (nodeId === 'sfmc-core' && (u.skills['sfmc-ampscript'] || u.skills['sfmc-ssjs-sql'])) ||
            (nodeId === 'sf-datacloud' && (u.skills['sf-datacloud-dmo'] || u.skills['sf-datacloud-insights']))
        );

        $('#node-modal-title').innerHTML = `<i class="fa-solid fa-microchip"></i> ${data.title}`;
        $('#node-modal-body').innerHTML = `
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">${data.desc}</p>
            <h4 class="inspector-subtitle"><i class="fa-solid fa-user-group"></i> Référents & Niveaux dans la Squad :</h4>
            <div style="margin-bottom: 1.25rem;">
                ${members.length === 0 ? '<p class="empty-hint">Aucun membre n\'a encore déclaré cette compétence.</p>' : ''}
                ${members.map(m => `
                    <div class="skill-badge-item">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="avatar-sm">${m.avatar}</div>
                            <span style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(m.name)}</span>
                        </div>
                        <span class="skill-badge-level ${levelClass(m.skills[nodeId])}">${m.skills[nodeId] || '—'}</span>
                    </div>`).join('')}
            </div>
            <div class="skill-assign-box">
                <h4 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; font-family: Montserrat;">
                    <i class="fa-solid fa-user-gear"></i> Votre niveau (${escapeHtml(activeUser.name)}) :
                    <span style="color: var(--lineup7-green);">${userLevelForSkill}</span>
                </h4>
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
                    <select id="select-my-skill-level" class="inline-select">
                        <option value="Confirmé" ${userLevelForSkill === 'Confirmé' ? 'selected' : ''}>Confirmé / Pratiquant</option>
                        <option value="Expert" ${userLevelForSkill === 'Expert' ? 'selected' : ''}>Expert / Référent</option>
                        <option value="En Apprentissage" ${userLevelForSkill === 'En Apprentissage' ? 'selected' : ''}>En Apprentissage</option>
                    </select>
                    <button class="btn btn-sm btn-primary" id="btn-save-my-skill"><i class="fa-solid fa-check"></i> Enregistrer</button>
                </div>
            </div>
            <div style="margin-top: 1.25rem;">
                <h4 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--accent-gold); font-family: Montserrat;">
                    <i class="fa-solid fa-file-code"></i> Blueprints & Assets disponibles :
                </h4>
                <ul style="list-style: none; font-size: 0.85rem;">
                    ${data.blueprints.map(b => `<li style="padding: 0.35rem 0;"><a href="#" class="blueprint-link" data-name="${escapeHtml(b)}"><i class="fa-solid fa-file-arrow-down"></i> ${escapeHtml(b)} <span style="font-size: 0.7rem; color: var(--text-dim); margin-left: 0.5rem;">[SharePoint / Git]</span></a></li>`).join('')}
                </ul>
            </div>`;
        openModal('node-modal');

        $('#btn-save-my-skill').addEventListener('click', () => {
            const level = $('#select-my-skill-level').value;
            const user = Store.getCurrentUser();
            const isNew = !user.skills[nodeId];
            user.skills[nodeId] = level;
            Store.saveUsers();
            renderMatrix();
            renderLeaderboard();
            renderBadges();
            if (isNew) awardXp(user, 100, 'compétence déclarée');
            else { Store.saveUsers(); checkBadges(user, earnedBadges(user).map(b => b.id)); }
            Toast.success(`Compétence mise à jour : <strong>${level}</strong>`);
            openNodeInspector(nodeId);
        });
        $$('.blueprint-link', $('#node-modal-body')).forEach(a => a.addEventListener('click', (e) => {
            e.preventDefault();
            Toast.info(`Ouverture du Blueprint : <strong>${escapeHtml(a.getAttribute('data-name'))}</strong> (SharePoint / Git)`);
        }));
    }

    function levelClass(level) {
        return level === 'Expert' ? 'level-expert' : level === 'Confirmé' ? 'level-confirmed' : 'level-learning';
    }

    function initSkillTree() {
        $$('.tree-node').forEach(node => node.addEventListener('click', () => openNodeInspector(node.getAttribute('data-node-id'))));
    }

    // ======================================================================
    // 12. Clinique Tech (incidents)
    // ======================================================================
    function initClinique() {
        const submitModal = $('#submit-modal');
        const btnOpen = $('#btn-open-submit-modal');
        const form = $('#incident-form');
        const container = $('#incidents-container');
        const countBadge = $('#nav-clinique-count');

        if (btnOpen) btnOpen.addEventListener('click', () => openModal('submit-modal'));

        if (form) form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = $('#inc-title').value.trim();
            const desc = $('#inc-desc').value.trim();
            const tech = $('#inc-tech').value;
            const user = Store.getCurrentUser();
            const card = document.createElement('div');
            card.className = 'incident-card urgent';
            card.innerHTML = `
                <div class="incident-header">
                    <span class="badge-status open"><i class="fa-solid fa-circle"></i> À l'Ordre du jour</span>
                    <span class="incident-date">À l'instant</span>
                </div>
                <h3 class="incident-title">${escapeHtml(title)}</h3>
                <p class="incident-desc">${escapeHtml(desc)}</p>
                <div class="incident-tags"><span class="tag">#${escapeHtml(tech)}</span></div>
                <div class="incident-footer">
                    <div class="author"><div class="avatar-sm primary">${user.avatar}</div><span>${escapeHtml(user.name)}</span></div>
                    <button class="btn btn-sm btn-outline btn-claim"><i class="fa-solid fa-hand-holding-hand"></i> M'inscrire pour l'aider</button>
                </div>`;
            container.prepend(card);
            closeModal(submitModal);
            form.reset();
            if (countBadge) countBadge.textContent = (parseInt(countBadge.textContent) || 0) + 1;
            Toast.success('Votre cas a été ajouté à la Clinique Tech !');
        });

        // Claim & Teams meeting (event delegation)
        document.addEventListener('click', (e) => {
            const claim = e.target.closest('.btn-claim');
            if (claim) {
                const user = Store.getCurrentUser();
                user.stats.incidentsHelped = (user.stats.incidentsHelped || 0) + 1;
                claim.className = 'btn btn-sm btn-primary btn-teams-meet';
                claim.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Planifier point Teams (15 min)`;
                awardXp(user, 60, 'inscription comme Helper');
                renderBadges();
                Toast.success(`Vous êtes inscrit comme Helper. Merci ${escapeHtml(user.name)} !`);
                return;
            }
            const teams = e.target.closest('.btn-teams-meet');
            if (teams) {
                const card = teams.closest('.incident-card');
                const title = card ? card.querySelector('.incident-title').textContent : 'Clinique Tech LineUp7';
                const url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent('Clinique Tech LineUp7 - Déblocage : ' + title)}&body=${encodeURIComponent('Bonjour,\n\nPrenons 15 minutes sur Teams pour résoudre ensemble ce point de blocage.\n\nCordialement,')}`;
                window.open(url, '_blank');
            }
        });

        // Loop doc generator
        const docForm = $('#doc-generator-form');
        const masterBody = $('#master-table-body');
        if (docForm) docForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = $('#gen-title').value.trim();
            const tags = $('#gen-tags').value.trim();
            const user = Store.getCurrentUser();
            user.stats.loopDocs = (user.stats.loopDocs || 0) + 1;
            const tagsHtml = tags.split(',').map(t => `<span class="tag">#${escapeHtml(t.trim())}</span>`).join(' ');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${todayFr()}</td>
                <td>${escapeHtml(title)}</td>
                <td>${tagsHtml}</td>
                <td>${escapeHtml(user.name)}</td>
                <td><a href="#" class="index-link doc-open"><i class="fa-solid fa-arrow-up-right-from-square"></i> Fiche Loop #NEW</a></td>`;
            masterBody.prepend(row);
            docForm.reset();
            awardXp(user, 50, 'fiche Loop publiée');
            renderBadges();
            Toast.success('Fiche Loop générée et publiée au Master Index !');
            activateTab('master-index');
        });
    }

    // ======================================================================
    // 13. Talent Matrix
    // ======================================================================
    const TECH_KEYS = [
        { key: 'sfmc-ampscript', label: 'AMPscript' },
        { key: 'sfmc-ssjs-sql', label: 'SSJS & SQL' },
        { key: 'sfmc-deliverability', label: 'Délivrabilité & BU' },
        { key: 'sfmc-next-flows', label: 'MC Next & Flows' },
        { key: 'sf-datacloud-dmo', label: 'Data Cloud DMO' },
        { key: 'sf-datacloud-insights', label: 'Insights & Transforms' },
        { key: 'agentforce-ia', label: 'Agentforce IA' },
        { key: 'agentforce-mcp', label: 'Serveurs MCP' },
        { key: 'imagino-cdp', label: 'Imagino CDP' },
        { key: 'imagino-campaign', label: 'Imagino Campaign' },
        { key: 'gcp-bigquery', label: 'GCP BigQuery' },
        { key: 'snowflake-data', label: 'Snowflake' },
        { key: 'dbt-modeling', label: 'Ingénierie dbt' },
        { key: 'airflow-pipelines', label: 'Airflow' },
        { key: 'martech-audit', label: 'Audit Tech' }
    ];

    function renderMatrix() {
        const body = $('#matrix-table-body');
        if (!body) return;
        body.innerHTML = '';
        Store.getUsers().forEach(user => {
            const tr = document.createElement('tr');
            let cells = `<td style="text-align: left; font-weight: 700;"><div style="display:flex;align-items:center;gap:0.5rem;"><div class="avatar-sm ${user.id === 'elian-m' ? 'primary' : ''}">${user.avatar}</div> ${escapeHtml(user.name)}</div></td>`;
            TECH_KEYS.forEach(t => {
                const level = user.skills[t.key];
                let badge;
                if (level === 'Expert') badge = `<span class="matrix-cell-badge level-expert"><i class="fa-solid fa-star"></i> Expert</span>`;
                else if (level === 'Confirmé') badge = `<span class="matrix-cell-badge level-confirmed">Confirmé</span>`;
                else if (level === 'En Apprentissage') badge = `<span class="matrix-cell-badge level-learning">Apprenti</span>`;
                else badge = `<span style="color: var(--text-dim); font-size: 0.75rem;">-</span>`;
                cells += `<td class="matrix-cell-editable" data-user-id="${user.id}" data-skill-key="${t.key}" title="Cliquer pour modifier l'expertise de ${escapeHtml(user.name)}">${badge}</td>`;
            });
            tr.innerHTML = cells;
            body.appendChild(tr);
        });

        $$('.matrix-cell-editable', body).forEach(cell => cell.addEventListener('click', () => {
            const user = Store.getUser(cell.getAttribute('data-user-id'));
            const key = cell.getAttribute('data-skill-key');
            if (!user) return;
            const cur = user.skills[key];
            let next = 'Confirmé';
            if (cur === 'Confirmé') next = 'Expert';
            else if (cur === 'Expert') next = 'En Apprentissage';
            else if (cur === 'En Apprentissage') next = null;
            const prevBadges = earnedBadges(user).map(b => b.id);
            if (next) user.skills[key] = next; else delete user.skills[key];
            Store.saveUsers();
            renderMatrix();
            renderLeaderboard();
            renderBadges();
            checkBadges(user, prevBadges);
        }));
    }

    function initMatrixToolbar() {
        const container = $('.table-container');
        const left = $('#btn-scroll-matrix-left');
        const right = $('#btn-scroll-matrix-right');
        if (left && container) left.addEventListener('click', () => container.scrollBy({ left: -350, behavior: 'smooth' }));
        if (right && container) right.addEventListener('click', () => container.scrollBy({ left: 350, behavior: 'smooth' }));
    }

    // ======================================================================
    // 14. Snippet Vault
    // ======================================================================
    function renderSnippets(filter = 'all') {
        const container = $('#snippets-container');
        if (!container) return;
        const all = Store.getSnippets();
        const filtered = filter === 'all' ? all : all.filter(s => s.category === filter);
        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = emptyState('fa-code', 'Aucun snippet dans cette catégorie', 'Soyez le premier à en publier un !');
            return;
        }
        filtered.forEach(s => {
            const author = s.authorId ? Store.getUser(s.authorId) : null;
            const card = document.createElement('div');
            card.className = 'snippet-card';
            card.innerHTML = `
                <div>
                    <div class="snippet-header">
                        <span class="tag">#${escapeHtml(s.category)}</span>
                        <span style="font-size: 0.72rem; color: var(--text-dim);"><i class="fa-solid fa-code"></i> ${author ? escapeHtml(author.name) : 'Template LineUp7'}</span>
                    </div>
                    <h3 class="snippet-title">${escapeHtml(s.title)}</h3>
                    <p class="snippet-desc">${escapeHtml(s.desc)}</p>
                    <div class="code-block-wrapper">
                        <button class="btn-copy-code" data-code="${encodeURIComponent(s.code)}"><i class="fa-solid fa-copy"></i> Copier</button>
                        <pre><code>${escapeHtml(s.code)}</code></pre>
                    </div>
                </div>`;
            container.appendChild(card);
        });
        $$('.btn-copy-code', container).forEach(btn => btn.addEventListener('click', () => {
            const code = decodeURIComponent(btn.getAttribute('data-code'));
            navigator.clipboard.writeText(code).then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
                setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copier', 2000);
            });
        }));
    }

    function initSnippets() {
        const modal = $('#add-snippet-modal');
        const btnOpen = $('#btn-open-add-snippet-modal');
        const form = $('#add-snippet-form');
        if (btnOpen) btnOpen.addEventListener('click', () => openModal('add-snippet-modal'));

        const scope = $('#tab-snippet-vault');
        $$('.filter-btn', scope).forEach(btn => btn.addEventListener('click', () => {
            $$('.filter-btn', scope).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSnippets(btn.getAttribute('data-filter'));
        }));

        if (form) form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = $('#new-snip-title').value.trim();
            const category = $('#new-snip-cat').value;
            const desc = $('#new-snip-desc').value.trim();
            const code = $('#new-snip-code').value.trim();
            if (!title || !code) return;
            const user = Store.getCurrentUser();
            Store.addSnippet({ id: uid('snip'), category, title, desc, code, authorId: user.id });
            user.stats.snippets = (user.stats.snippets || 0) + 1;
            renderSnippets('all');
            $$('.filter-btn', $('#tab-snippet-vault')).forEach(b => b.classList.toggle('active', b.getAttribute('data-filter') === 'all'));
            closeModal(modal);
            form.reset();
            awardXp(user, 40, 'snippet publié');
            renderBadges();
            Toast.success(`Snippet <strong>${escapeHtml(title)}</strong> ajouté au Vault !`);
        });
    }

    // ======================================================================
    // 15. Master Index search
    // ======================================================================
    function initMasterIndex() {
        const input = $('#search-index');
        const body = $('#master-table-body');
        if (input && body) input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            $$('tr', body).forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
        });
        document.addEventListener('click', (e) => {
            const open = e.target.closest('.doc-open, .index-link');
            if (open) { e.preventDefault(); Toast.info('Ouverture de la Fiche Loop sur Microsoft Teams…'); }
        });
    }

    // ======================================================================
    // 16. Squad — leaderboard, profile modal, badges
    // ======================================================================
    function openUserDetailModal(user) {
        const modal = $('#user-detail-modal');
        if (!modal) return;
        $('#user-detail-modal-title').innerHTML = `<i class="fa-solid fa-id-card"></i> Profil Squad : ${escapeHtml(user.name)}`;
        const skills = Object.keys(user.skills);
        const skillsList = skills.map(k => `
            <div class="profile-skill-row">
                <span style="font-weight: 700; font-size: 0.82rem;">${escapeHtml((nodeDetails[k] && nodeDetails[k].title) || '#' + k)}</span>
                <span class="matrix-cell-badge ${levelClass(user.skills[k])}">${user.skills[k]}</span>
            </div>`).join('');
        const badges = earnedBadges(user);
        const badgesHtml = badges.length ? badges.map(b => badgeChip(b)).join('') : '<p class="empty-hint">Aucun badge débloqué pour le moment.</p>';

        $('#user-detail-modal-body').innerHTML = `
            <div class="profile-hero">
                <div class="avatar" style="width: 56px; height: 56px; font-size: 1.2rem;">${user.avatar}</div>
                <div>
                    <h3 style="font-size: 1.2rem; font-weight: 800; font-family: Montserrat;">${escapeHtml(user.name)}</h3>
                    <span style="font-size: 0.82rem; color: var(--lineup7-green); font-weight: 600;">${escapeHtml(user.role)}</span>
                </div>
                <div class="profile-stats">
                    <div><strong>Niv. ${Store.level(user)}</strong><span>${user.xp} XP</span></div>
                    <div><strong>${badges.length}</strong><span>Badges</span></div>
                    <div><strong>${skills.length}</strong><span>Compétences</span></div>
                </div>
            </div>
            <h4 class="inspector-subtitle"><i class="fa-solid fa-award"></i> Badges obtenus :</h4>
            <div class="profile-badges">${badgesHtml}</div>
            <h4 class="inspector-subtitle" style="margin-top: 1.25rem;"><i class="fa-solid fa-layer-group"></i> Compétences déclarées :</h4>
            <div style="margin-bottom: 1rem;">${skillsList || '<p class="empty-hint">Aucune compétence déclarée.</p>'}</div>
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm btn-primary" id="btn-switch-to-user"><i class="fa-solid fa-right-to-bracket"></i> Incarner ce profil</button>
            </div>`;
        openModal('user-detail-modal');
        $('#btn-switch-to-user').addEventListener('click', () => {
            Store.setCurrentUser(user.id);
            renderAll();
            closeModal(modal);
            Toast.info(`Vous êtes maintenant connecté en tant que <strong>${escapeHtml(user.name)}</strong>`);
        });
    }

    function renderLeaderboard() {
        const list = $('.leader-list');
        if (!list) return;
        const currentId = Store.getCurrentUserId();
        // Sort by XP descending for a real leaderboard
        const ranked = [...Store.getUsers()].sort((a, b) => b.xp - a.xp);
        list.innerHTML = '';
        ranked.forEach((u, i) => {
            const li = document.createElement('li');
            li.className = `leader-item ${u.id === currentId ? 'is-current' : ''}`;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            li.innerHTML = `
                <span class="rank-medal">${medal}</span>
                <div class="avatar-sm ${u.id === 'elian-m' ? 'primary' : ''}">${u.avatar}</div>
                <div class="leader-details">
                    <span class="name">${escapeHtml(u.name)} ${u.id === currentId ? '<span class="badge-tag" style="font-size: 0.6rem;">VOUS</span>' : ''}</span>
                    <span class="role">${escapeHtml(u.role)}</span>
                    <span class="leader-badges">${earnedBadges(u).slice(0, 5).map(b => `<i class="fa-solid ${b.icon}" title="${escapeHtml(b.name)}"></i>`).join('')}</span>
                </div>
                <div class="leader-xp"><span class="xp">${u.xp}</span><span class="xp-lbl">XP</span></div>`;
            li.addEventListener('click', () => openUserDetailModal(u));
            list.appendChild(li);
        });
    }

    function badgeChip(b) {
        const icon = b.iconBrand ? `<i class="fa-brands ${b.icon}"></i>` : `<i class="fa-solid ${b.icon}"></i>`;
        return `<span class="badge-chip tier-${b.tier}" title="${escapeHtml(b.desc)}">${icon} ${escapeHtml(b.name)}</span>`;
    }

    // Badge showcase for the CURRENT user (unlocked + locked with progress)
    function renderBadges() {
        const container = $('#badges-showcase');
        if (!container) return;
        const user = Store.getCurrentUser();
        const earned = new Set(earnedBadges(user).map(b => b.id));
        const total = BADGES.length;
        const unlocked = earned.size;

        const header = $('#badges-progress-text');
        if (header) header.textContent = `${unlocked} / ${total} badges débloqués`;
        const fill = $('#badges-progress-fill');
        if (fill) fill.style.width = Math.round((unlocked / total) * 100) + '%';

        container.innerHTML = '';
        BADGES.forEach(b => {
            const isEarned = earned.has(b.id);
            const icon = b.iconBrand ? `<i class="fa-brands ${b.icon}"></i>` : `<i class="fa-solid ${b.icon}"></i>`;
            let progressHtml = '';
            if (!isEarned && b.progress) {
                const p = b.progress(user);
                const pct = Math.round((p.current / p.target) * 100);
                progressHtml = `<div class="badge-progress"><div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div><span>${p.current}/${p.target}</span></div>`;
            }
            const box = document.createElement('div');
            box.className = `badge-box tier-${b.tier} ${isEarned ? 'unlocked' : 'locked'}`;
            box.innerHTML = `
                <div class="badge-medal">${icon}${isEarned ? '<span class="badge-check"><i class="fa-solid fa-check"></i></span>' : '<span class="badge-lock"><i class="fa-solid fa-lock"></i></span>'}</div>
                <h4>${escapeHtml(b.name)}</h4>
                <p>${escapeHtml(b.desc)}</p>
                <span class="badge-tier-label">${b.tier}</span>
                ${progressHtml}`;
            container.appendChild(box);
        });
    }

    // ======================================================================
    // 17. Blog & LinkedIn
    // ======================================================================
    let currentBlogFilter = 'all';

    function blogCategories() {
        const cats = new Set(Store.getArticles().map(a => a.category).filter(Boolean));
        return ['all', ...cats];
    }

    function renderBlogFilters() {
        const wrap = $('#blog-filters');
        if (!wrap) return;
        wrap.innerHTML = blogCategories().map(c =>
            `<button class="filter-btn ${c === currentBlogFilter ? 'active' : ''}" data-blog-filter="${escapeHtml(c)}">${c === 'all' ? 'Tous' : escapeHtml(c)}</button>`
        ).join('');
        $$('[data-blog-filter]', wrap).forEach(btn => btn.addEventListener('click', () => {
            currentBlogFilter = btn.getAttribute('data-blog-filter');
            renderBlogFilters();
            renderArticles();
        }));
    }

    function renderArticles() {
        const container = $('#articles-container');
        if (!container) return;
        const currentId = Store.getCurrentUserId();
        let list = Store.getArticles();
        if (currentBlogFilter !== 'all') list = list.filter(a => a.category === currentBlogFilter);
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = emptyState('fa-newspaper', 'Aucun article', 'Rédigez le premier article de la Guilde !');
            return;
        }
        list.forEach(art => {
            const liked = art.likedBy.includes(currentId);
            const canManage = art.author === Store.getCurrentUser().name;
            const card = document.createElement('div');
            card.className = 'snippet-card article-card';
            card.innerHTML = `
                <div>
                    <div class="snippet-header">
                        <span class="tag">${escapeHtml((art.tags || '').split(' ')[0] || '#Article')}</span>
                        <span style="font-size: 0.75rem; color: var(--lineup7-green); font-weight: 700;"><i class="fa-solid fa-clock"></i> ${escapeHtml(art.readTime)}</span>
                    </div>
                    <h3 class="snippet-title">${escapeHtml(art.title)}</h3>
                    <p class="snippet-desc">${escapeHtml(art.summary)}</p>
                </div>
                <div>
                    <div class="article-meta">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="avatar-sm primary">${art.authorAvatar}</div>
                            <span style="font-size: 0.8rem; font-weight: 700;">${escapeHtml(art.author)}</span>
                        </div>
                        <div class="article-stats">
                            <button class="icon-btn like-btn ${liked ? 'liked' : ''}" data-like="${art.id}" title="J'aime"><i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> <span>${art.likes}</span></button>
                            <span class="reads" title="Lectures"><i class="fa-regular fa-eye"></i> ${art.reads}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-outline btn-read-article" data-article-id="${art.id}"><i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i> Lire</button>
                        ${canManage ? `<button class="icon-btn edit-article" data-edit="${art.id}" title="Éditer"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete-article" data-delete="${art.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            container.appendChild(card);
        });

        $$('.btn-read-article', container).forEach(btn => btn.addEventListener('click', () => {
            const art = Store.getArticles().find(a => a.id === btn.getAttribute('data-article-id'));
            if (art) openArticleReader(art);
        }));
        $$('.like-btn', container).forEach(btn => btn.addEventListener('click', () => toggleLike(btn.getAttribute('data-like'))));
        $$('.edit-article', container).forEach(btn => btn.addEventListener('click', () => openArticleEditor(btn.getAttribute('data-edit'))));
        $$('.delete-article', container).forEach(btn => btn.addEventListener('click', () => deleteArticle(btn.getAttribute('data-delete'))));
    }

    function toggleLike(id) {
        const art = Store.getArticles().find(a => a.id === id);
        if (!art) return;
        const uidv = Store.getCurrentUserId();
        const idx = art.likedBy.indexOf(uidv);
        if (idx >= 0) { art.likedBy.splice(idx, 1); art.likes = Math.max(0, art.likes - 1); }
        else { art.likedBy.push(uidv); art.likes += 1; }
        Store.saveArticles();
        renderArticles();
    }

    async function deleteArticle(id) {
        const art = Store.getArticles().find(a => a.id === id);
        if (!art) return;
        const ok = await confirmDialog(`Supprimer l'article <strong>« ${escapeHtml(art.title)} »</strong> ? Cette action est irréversible.`, { confirmLabel: 'Supprimer' });
        if (!ok) return;
        Store.removeArticle(id);
        renderBlogFilters();
        renderArticles();
        Toast.warning('Article supprimé.');
    }

    function openArticleReader(art) {
        // Count a read (once per open)
        art.reads = (art.reads || 0) + 1;
        Store.saveArticles();
        $('#reader-article-title').innerHTML = `<i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i> ${escapeHtml(art.title)}`;
        $('#reader-article-body').innerHTML = `
            <div class="reader-meta">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="avatar-sm primary">${art.authorAvatar}</div>
                    <div>
                        <span style="font-weight: 800; font-size: 0.85rem;">${escapeHtml(art.author)}</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Publié le ${escapeHtml(art.date)} · ${art.reads} lectures</span>
                    </div>
                </div>
                <span class="tag" style="background: rgba(10,102,194,0.15); color:#0a66c2; border-color: rgba(10,102,194,0.3);">${escapeHtml(art.tags)}</span>
            </div>
            <div class="markdown-body">${renderMarkdown(art.content)}</div>
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm btn-outline" id="btn-download-md"><i class="fa-solid fa-download"></i> Télécharger .md</button>
                <button class="btn btn-sm btn-primary" id="btn-copy-linkedin-post"><i class="fa-brands fa-linkedin"></i> Copier pour LinkedIn</button>
            </div>`;
        openModal('article-reader-modal');
        renderArticles();

        $('#btn-copy-linkedin-post').addEventListener('click', () => {
            navigator.clipboard.writeText(art.content).then(() => Toast.success('Post Markdown copié ! Prêt à coller sur LinkedIn.'));
        });
        $('#btn-download-md').addEventListener('click', () => {
            const blob = new Blob([art.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `LineUp7_Article_${art.id}.md`; a.click();
            URL.revokeObjectURL(url);
        });
    }

    let editingArticleId = null;

    function openArticleEditor(id) {
        editingArticleId = id || null;
        const art = id ? Store.getArticles().find(a => a.id === id) : null;
        $('#add-article-modal .modal-header h3').innerHTML = art
            ? `<i class="fa-solid fa-pen"></i> Éditer l'article`
            : `<i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i> Rédiger un Article (Markdown)`;
        $('#new-art-title').value = art ? art.title : '';
        $('#new-art-tag').value = art ? art.tags : '';
        $('#new-art-time').value = art ? art.readTime : '4 min';
        $('#new-art-content').value = art ? art.content : '';
        openModal('add-article-modal');
    }

    function initBlog() {
        const modal = $('#add-article-modal');
        const btnOpen = $('#btn-open-add-article-modal');
        const form = $('#add-article-form');
        if (btnOpen) btnOpen.addEventListener('click', () => openArticleEditor(null));

        if (form) form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = $('#new-art-title').value.trim();
            const tag = $('#new-art-tag').value.trim();
            const readTime = $('#new-art-time').value.trim() || '4 min';
            const content = $('#new-art-content').value.trim();
            if (!title || !content) return;
            const user = Store.getCurrentUser();
            const category = (tag.split(' ')[0] || '#Article').replace('#', '') || 'Article';

            if (editingArticleId) {
                const art = Store.getArticles().find(a => a.id === editingArticleId);
                if (art) {
                    Object.assign(art, { title, tags: tag, readTime, content, category, summary: content.replace(/[#*`>-]/g, '').slice(0, 120).trim() + '…' });
                    Store.saveArticles();
                    Toast.success('Article mis à jour.');
                }
            } else {
                Store.addArticle({
                    id: uid('art'), title, author: user.name, authorId: user.id, authorAvatar: user.avatar,
                    date: todayFr(), readTime, tags: tag, category,
                    summary: content.replace(/[#*`>-]/g, '').slice(0, 120).trim() + '…',
                    content, likes: 0, likedBy: [], reads: 0
                });
                user.stats.articles = (user.stats.articles || 0) + 1;
                awardXp(user, 75, 'article publié');
                renderBadges();
                Toast.success(`Article <strong>${escapeHtml(title)}</strong> publié !`);
            }
            editingArticleId = null;
            renderBlogFilters();
            renderArticles();
            closeModal(modal);
            form.reset();
        });
    }

    // ======================================================================
    // 18. Shared helpers
    // ======================================================================
    function emptyState(icon, title, hint) {
        return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h4>${escapeHtml(title)}</h4><p>${escapeHtml(hint)}</p></div>`;
    }

    // ======================================================================
    // 18a. Skeleton loaders & premium reveal
    // ======================================================================
    function skStatCard() {
        return `<div class="stat-card"><div class="skeleton sk-circle" style="width:44px;height:44px;margin-bottom:0.85rem;"></div><div class="skeleton sk-line sk-lg w-40"></div><div class="skeleton sk-line sk-sm w-80"></div></div>`;
    }
    function skRow() {
        return `<div class="sk-row"><div class="skeleton sk-circle" style="width:34px;height:34px;flex-shrink:0;"></div><div style="flex:1;min-width:0;"><div class="skeleton sk-line w-60"></div><div class="skeleton sk-line sk-sm w-40"></div></div></div>`;
    }
    function skBar() {
        return `<div style="padding:0.55rem 0;"><div class="skeleton sk-line sk-sm w-40" style="margin-bottom:0.45rem;"></div><div class="skeleton sk-line w-100"></div></div>`;
    }
    function fill(id, html) { const el = $(id); if (el) el.innerHTML = html; }
    function rep(n, fn) { return Array.from({ length: n }, fn).join(''); }

    // Restart the staggered entrance animation on a container's direct children
    function reveal() {
        if (prefersReducedMotion()) return;
        for (let i = 0; i < arguments.length; i++) {
            const el = $(arguments[i]);
            if (!el) continue;
            el.classList.remove('reveal-in');
            void el.offsetWidth; // force reflow so the animation replays
            el.classList.add('reveal-in');
        }
    }

    function dashSkeleton() {
        fill('#dash-stats', rep(5, skStatCard));
        fill('#dash-progress', `<div class="sk-row"><div class="skeleton sk-circle" style="width:92px;height:92px;flex-shrink:0;"></div><div style="flex:1;"><div class="skeleton sk-line w-60"></div><div class="skeleton sk-line w-100"></div><div class="skeleton sk-line sk-sm w-40"></div></div></div>`);
        fill('#dash-clinique', rep(3, skRow));
        fill('#dash-articles', rep(3, skRow));
        fill('#dash-next-badges', rep(3, skRow));
        fill('#dash-activity', rep(4, skRow));
    }
    function analyticsSkeleton() {
        fill('#analytics-kpis', rep(4, skStatCard));
        fill('#radar-container', `<div class="skeleton sk-svg" style="width:100%;"></div>`);
        fill('#spof-list', rep(5, skRow));
        fill('#skills-heatmap', `<div class="skeleton" style="width:100%;height:220px;"></div>`);
        fill('#coverage-list', rep(5, skBar));
    }

    // Enter a data-heavy tab: flash skeletons, then reveal real content (premium feel).
    function enterDashboard() {
        if (prefersReducedMotion()) { renderDashboard(); return; }
        dashSkeleton();
        setTimeout(() => { renderDashboard(); reveal('#dash-stats', '.dash-col-main', '.dash-col-side'); }, 420);
    }
    function enterAnalytics() {
        if (prefersReducedMotion()) { renderAnalytics(); return; }
        analyticsSkeleton();
        setTimeout(() => { renderAnalytics(); reveal('#analytics-kpis', '.analytics-grid'); }, 480);
    }

    // ======================================================================
    // 18b. Dashboard
    // ======================================================================
    function renderDashboard() {
        const user = Store.getCurrentUser();
        const users = Store.getUsers();
        const level = Store.level(user);

        const greetEl = $('#dash-greeting');
        if (greetEl) {
            const h = new Date().getHours();
            const g = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
            greetEl.textContent = `${g}, ${user.name.split('.')[0]}`;
        }

        const earned = earnedBadges(user).length;
        const openIncidents = $$('#incidents-container .incident-card').length;
        const stats = [
            { icon: 'fa-bolt', accent: '', value: level, suffix: '', label: 'Votre niveau', trend: `${user.xp.toLocaleString('fr-FR')} XP cumulés` },
            { icon: 'fa-award', accent: 'accent-gold', value: earned, suffix: `/${BADGES.length}`, label: 'Badges débloqués' },
            { icon: 'fa-users', accent: 'accent-purple', value: users.length, suffix: '', label: 'Membres de la Guilde' },
            { icon: 'fa-code', accent: 'accent-cyan', value: Store.getSnippets().length, suffix: '', label: 'Snippets au Vault' },
            { icon: 'fa-kit-medical', accent: 'accent-rose', value: openIncidents, suffix: '', label: 'Cas Clinique ouverts' }
        ];
        const statGrid = $('#dash-stats');
        if (statGrid) {
            statGrid.innerHTML = stats.map(s => `
                <div class="stat-card ${s.accent}">
                    <div class="stat-icon"><i class="fa-solid ${s.icon}"></i></div>
                    <div class="stat-value">0${s.suffix || ''}</div>
                    <div class="stat-label">${s.label}</div>
                    ${s.trend ? `<div class="stat-trend"><i class="fa-solid fa-arrow-trend-up"></i> ${s.trend}</div>` : ''}
                </div>`).join('');
            $$('.stat-value', statGrid).forEach((el, i) => animateCounter(el, stats[i].value, { suffix: stats[i].suffix || '' }));
        }

        const prog = $('#dash-progress');
        if (prog) {
            const pct = user.xp % 100;
            prog.innerHTML = `
                <div class="dash-progress-hero">
                    <div class="level-ring" style="--pct:${pct}"><div style="text-align:center"><b>${level}</b><small>niveau</small></div></div>
                    <div class="dash-progress-meta">
                        <div class="xp-line"><span>${user.xp.toLocaleString('fr-FR')} XP au total</span><strong>${pct} / 100</strong></div>
                        <div class="xp-progress-track"><div class="xp-progress-fill" id="dash-xp-fill"></div></div>
                        <span class="xp-progress-label">Plus que <strong>${100 - pct} XP</strong> pour atteindre le niveau ${level + 1}</span>
                    </div>
                </div>`;
            requestAnimationFrame(() => { const f = $('#dash-xp-fill'); if (f) f.style.width = pct + '%'; });
        }

        const clinique = $('#dash-clinique');
        if (clinique) {
            const cards = $$('#incidents-container .incident-card').slice(0, 3);
            clinique.innerHTML = cards.length ? cards.map(c => {
                const title = (c.querySelector('.incident-title') || {}).textContent || '';
                const author = (c.querySelector('.author span') || {}).textContent || '';
                const urgent = c.classList.contains('urgent');
                return `<div class="mini-item"><span class="mini-dot" style="color:${urgent ? 'var(--rose)' : 'var(--gold)'}"></span><div class="mini-body"><div class="mini-title">${escapeHtml(title)}</div><div class="mini-sub">${escapeHtml(author)}</div></div></div>`;
            }).join('') : '<p class="empty-hint">Aucun cas ouvert. Tout roule ✨</p>';
        }

        const artC = $('#dash-articles');
        if (artC) {
            const arts = Store.getArticles().slice(0, 3);
            if (!arts.length) artC.innerHTML = '<p class="empty-hint">Aucun article publié.</p>';
            else {
                artC.innerHTML = arts.map(a => `<div class="mini-item" data-art="${a.id}"><div class="avatar-sm primary">${a.authorAvatar}</div><div class="mini-body"><div class="mini-title">${escapeHtml(a.title)}</div><div class="mini-sub">${escapeHtml(a.author)} · ${escapeHtml(a.readTime)} · <i class="fa-regular fa-heart"></i> ${a.likes}</div></div></div>`).join('');
                $$('.mini-item[data-art]', artC).forEach(el => el.addEventListener('click', () => {
                    const art = Store.getArticles().find(a => a.id === el.getAttribute('data-art'));
                    if (art) openArticleReader(art);
                }));
            }
        }

        const nb = $('#dash-next-badges');
        if (nb) {
            const earnedSet = new Set(earnedBadges(user).map(b => b.id));
            const candidates = BADGES.filter(b => !earnedSet.has(b.id) && b.progress)
                .map(b => { const p = b.progress(user); return { b, pct: Math.round((p.current / p.target) * 100), p }; })
                .sort((a, z) => z.pct - a.pct).slice(0, 3);
            nb.innerHTML = candidates.length ? candidates.map(({ b, pct, p }) => `
                <div class="next-badge-row">
                    <div class="next-badge-ic"><i class="fa-solid ${b.icon}"></i></div>
                    <div class="nb-body"><div class="nb-name">${escapeHtml(b.name)}</div><div class="nb-bar"><div class="nb-fill" style="width:${pct}%"></div></div></div>
                    <span class="nb-count">${p.current}/${p.target}</span>
                </div>`).join('') : '<p class="empty-hint">Tous les badges à progression sont débloqués 🎉</p>';
        }

        renderActivity();
    }

    function renderActivity() {
        const feed = $('#dash-activity');
        if (!feed) return;
        const icons = { xp: 'fa-bolt', badge: 'fa-award', clinique: 'fa-kit-medical', article: 'fa-newspaper', snippet: 'fa-code', info: 'fa-circle-info' };
        const events = Feed.all().slice(0, 7);
        feed.innerHTML = events.length ? events.map(e => `
            <div class="activity-item">
                <div class="activity-ic"><i class="fa-solid ${icons[e.type] || 'fa-circle-info'}"></i></div>
                <div class="act-body"><strong style="font-weight:700;">${escapeHtml(e.title)}</strong><div style="color:var(--text-muted);">${escapeHtml(e.msg)}</div><div class="act-time">${timeAgo(e.ts)}</div></div>
            </div>`).join('') : '<p class="empty-hint">Aucune activité récente.</p>';
    }

    function initDashboard() {
        const btn = $('#dash-quick-article');
        if (btn) btn.addEventListener('click', () => { activateTab('blog'); openArticleEditor(null); });
    }

    // ======================================================================
    // 18c. Notifications
    // ======================================================================
    function refreshFeedUI() {
        renderNotifBell();
        renderNotifPanel();
        const dash = $('#tab-dashboard');
        if (dash && dash.classList.contains('active')) renderActivity();
    }
    function renderNotifBell() {
        const count = Feed.unread();
        const dot = $('#notif-count');
        const bell = $('#notif-bell');
        if (dot) { dot.textContent = count; dot.hidden = count === 0; }
        if (bell) bell.classList.toggle('has-unread', count > 0);
    }
    function renderNotifPanel() {
        const list = $('#notif-list');
        if (!list) return;
        const icons = { xp: 'fa-bolt', badge: 'fa-award', clinique: 'fa-kit-medical', article: 'fa-newspaper', snippet: 'fa-code', info: 'fa-circle-info' };
        const events = Feed.all().slice(0, 20);
        list.innerHTML = events.length ? events.map(e => `
            <div class="notif-entry type-${e.type} ${e.read ? '' : 'unread'}">
                <div class="notif-entry-ic"><i class="fa-solid ${icons[e.type] || 'fa-circle-info'}"></i></div>
                <div class="notif-entry-body">
                    <div class="notif-entry-title">${escapeHtml(e.title)}</div>
                    <div class="notif-entry-msg">${escapeHtml(e.msg)}</div>
                    <div class="notif-entry-time">${timeAgo(e.ts)}</div>
                </div>
            </div>`).join('') : '<p class="empty-hint" style="padding:1rem;">Aucune notification.</p>';
    }
    function initNotifications() {
        const bell = $('#notif-bell');
        const panel = $('#notif-panel');
        const mark = $('#notif-mark-read');
        if (bell && panel) bell.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.hidden = !panel.hidden;
            if (!panel.hidden) renderNotifPanel();
        });
        if (mark) mark.addEventListener('click', () => { Feed.markAllRead(); refreshFeedUI(); });
        document.addEventListener('click', (e) => {
            if (panel && !panel.hidden && !panel.contains(e.target) && !e.target.closest('#notif-bell')) panel.hidden = true;
        });
        renderNotifBell();
    }

    // ======================================================================
    // 18d. Guild Analytics
    // ======================================================================
    const RADAR_AXES = [
        { label: 'SFMC', keys: ['sfmc-ampscript', 'sfmc-ssjs-sql', 'sfmc-deliverability', 'sfmc-next-flows'] },
        { label: 'Data Cloud', keys: ['sf-datacloud-dmo', 'sf-datacloud-insights'] },
        { label: 'Agentforce', keys: ['agentforce-ia', 'agentforce-mcp'] },
        { label: 'Imagino', keys: ['imagino-cdp', 'imagino-campaign'] },
        { label: 'Data Stack', keys: ['gcp-bigquery', 'snowflake-data', 'dbt-modeling', 'airflow-pipelines'] },
        { label: 'Audit', keys: ['martech-audit'] }
    ];
    function skillScore(user, key) { const l = user.skills[key]; return l === 'Expert' ? 3 : l === 'Confirmé' ? 2 : l === 'En Apprentissage' ? 1 : 0; }
    function axisScore(user, axis) { return axis.keys.reduce((s, k) => s + skillScore(user, k), 0) / axis.keys.length; }

    function radarSvg(user) {
        const cx = 170, cy = 155, R = 115, n = RADAR_AXES.length;
        const angleFor = i => -Math.PI / 2 + i * 2 * Math.PI / n;
        let rings = '';
        for (let lvl = 1; lvl <= 3; lvl++) {
            const r = (lvl / 3) * R;
            const pts = RADAR_AXES.map((_, i) => `${(cx + r * Math.cos(angleFor(i))).toFixed(1)},${(cy + r * Math.sin(angleFor(i))).toFixed(1)}`).join(' ');
            rings += `<polygon class="radar-grid-line" points="${pts}" />`;
        }
        let spokes = '', labels = '';
        RADAR_AXES.forEach((ax, i) => {
            const a = angleFor(i);
            const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
            spokes += `<line class="radar-grid-line" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
            const lx = cx + (R + 20) * Math.cos(a), ly = cy + (R + 20) * Math.sin(a);
            const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
            labels += `<text class="radar-axis-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${ax.label}</text>`;
        });
        const dataPts = RADAR_AXES.map((ax, i) => {
            const r = (axisScore(user, ax) / 3) * R;
            return [cx + r * Math.cos(angleFor(i)), cy + r * Math.sin(angleFor(i))];
        });
        const poly = dataPts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const dots = dataPts.map(p => `<circle class="radar-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" />`).join('');
        return `<svg class="radar-svg" viewBox="0 0 340 320" role="img" aria-label="Radar de compétences de ${escapeHtml(user.name)}">${rings}${spokes}<polygon class="radar-poly" points="${poly}" />${dots}${labels}</svg>`;
    }

    function renderAnalytics() {
        const users = Store.getUsers();

        const kpis = $('#analytics-kpis');
        const coverageAvg = Math.round(RADAR_AXES.reduce((s, ax) => s + users.reduce((u2, u) => u2 + axisScore(u, ax) / 3, 0) / users.length, 0) / RADAR_AXES.length * 100);
        const spofCount = TECH_KEYS.filter(t => users.filter(u => u.skills[t.key] === 'Expert').length <= 1).length;
        if (kpis) {
            const cards = [
                { icon: 'fa-users', accent: 'accent-purple', value: users.length, suffix: '', label: 'Membres actifs' },
                { icon: 'fa-diagram-project', accent: '', value: TECH_KEYS.length, suffix: '', label: 'Compétences suivies' },
                { icon: 'fa-gauge-high', accent: 'accent-cyan', value: coverageAvg, suffix: '%', label: 'Maîtrise moyenne' },
                { icon: 'fa-shield-halved', accent: 'accent-rose', value: spofCount, suffix: '', label: 'Compétences fragiles (SPOF)' }
            ];
            kpis.innerHTML = cards.map(c => `
                <div class="stat-card ${c.accent}">
                    <div class="stat-icon"><i class="fa-solid ${c.icon}"></i></div>
                    <div class="stat-value">0${c.suffix || ''}</div>
                    <div class="stat-label">${c.label}</div>
                </div>`).join('');
            $$('.stat-value', kpis).forEach((el, i) => animateCounter(el, cards[i].value, { suffix: cards[i].suffix || '' }));
        }

        const sel = $('#radar-member-select');
        const container = $('#radar-container');
        if (sel && container) {
            if (!sel.options.length) {
                sel.innerHTML = users.map(u => `<option value="${u.id}">${escapeHtml(u.name)} — ${escapeHtml(u.role)}</option>`).join('');
                sel.value = Store.getCurrentUserId();
                sel.addEventListener('change', () => {
                    const u = Store.getUser(sel.value);
                    if (u) container.innerHTML = radarSvg(u);
                });
            }
            const u = Store.getUser(sel.value) || Store.getCurrentUser();
            container.innerHTML = radarSvg(u);
        }

        const spofEl = $('#spof-list');
        if (spofEl) {
            const rows = TECH_KEYS.map(t => {
                const experts = users.filter(u => u.skills[t.key] === 'Expert');
                let flag;
                if (experts.length === 0) flag = { c: 'risk', txt: 'Aucun expert' };
                else if (experts.length === 1) flag = { c: 'risk', txt: '1 expert' };
                else if (experts.length === 2) flag = { c: 'warn', txt: '2 experts' };
                else flag = { c: 'ok', txt: experts.length + ' experts' };
                return { t, experts, flag, risk: experts.length <= 1 ? 0 : experts.length === 2 ? 1 : 2 };
            }).sort((a, z) => a.risk - z.risk);
            spofEl.innerHTML = rows.map(r => `
                <div class="spof-item">
                    <span class="spof-name">${escapeHtml(r.t.label)}</span>
                    <span class="spof-holders">${r.experts.map(e => escapeHtml(e.avatar)).join(' ') || '—'}</span>
                    <span class="spof-flag ${r.flag.c}">${r.flag.txt}</span>
                </div>`).join('');
        }

        const heat = $('#skills-heatmap');
        if (heat) {
            const cols = RADAR_AXES.length;
            let html = `<div class="heatmap-grid" style="grid-template-columns: 120px repeat(${cols}, minmax(46px,1fr));">`;
            html += `<div class="heat-label"></div>`;
            RADAR_AXES.forEach(ax => { html += `<div class="heat-label" style="justify-content:center;font-size:0.6rem;text-align:center;">${escapeHtml(ax.label)}</div>`; });
            users.forEach(u => {
                html += `<div class="heat-label"><div class="avatar-sm" style="margin-right:0.4rem;width:22px;height:22px;font-size:0.6rem;">${u.avatar}</div>${escapeHtml(u.name)}</div>`;
                RADAR_AXES.forEach(ax => {
                    const sc = axisScore(u, ax);
                    const bucket = sc === 0 ? 0 : sc <= 1 ? 1 : sc <= 2 ? 2 : 3;
                    html += `<div class="heat-cell heat-${bucket}" title="${escapeHtml(ax.label)} : ${sc.toFixed(1)}/3">${sc ? sc.toFixed(1) : ''}</div>`;
                });
            });
            html += '</div>';
            heat.innerHTML = html;
        }

        const cov = $('#coverage-list');
        if (cov) {
            cov.innerHTML = RADAR_AXES.map(ax => {
                const pct = Math.round(users.reduce((s, u) => s + axisScore(u, ax) / 3, 0) / users.length * 100);
                return `<div class="coverage-item"><div class="coverage-top"><span>${escapeHtml(ax.label)}</span><strong>${pct}%</strong></div><div class="coverage-bar"><div class="coverage-fill" style="width:${pct}%"></div></div></div>`;
            }).join('');
        }
    }

    // ======================================================================
    // 18e. Command palette / global search
    // ======================================================================
    let searchState = { filtered: [], active: 0 };
    const KIND_ORDER = ['Navigation', 'Membre', 'Compétence', 'Snippet', 'Article'];

    function buildSearchIndex() {
        const idx = [];
        const navs = [
            ['dashboard', 'Accueil', 'fa-gauge-high'], ['analytics', 'Guild Analytics', 'fa-chart-pie'],
            ['karma', 'Squad & Badges', 'fa-trophy'], ['skill-tree', 'Skill Tree', 'fa-sitemap'],
            ['talent-matrix', 'Matrice des Talents', 'fa-table-cells'], ['snippet-vault', 'Snippet Vault', 'fa-code'],
            ['clinique', 'Clinique Tech', 'fa-kit-medical'], ['master-index', 'Master Index', 'fa-database'],
            ['quests', 'Quêtes', 'fa-scroll'], ['blog', 'Blog & LinkedIn', 'fa-newspaper']
        ];
        navs.forEach(([tab, label, icon]) => idx.push({ kind: 'Navigation', title: label, meta: 'Ouvrir la section', icon, action: () => activateTab(tab) }));
        Store.getUsers().forEach(u => idx.push({ kind: 'Membre', title: u.name, meta: u.role, icon: 'fa-user', action: () => { activateTab('karma'); openUserDetailModal(u); } }));
        Object.keys(nodeDetails).forEach(k => idx.push({ kind: 'Compétence', title: nodeDetails[k].title, meta: nodeDetails[k].desc, icon: 'fa-microchip', action: () => { activateTab('skill-tree'); openNodeInspector(k); } }));
        Store.getSnippets().forEach(s => idx.push({ kind: 'Snippet', title: s.title, meta: '#' + s.category + ' · ' + s.desc, icon: 'fa-code', action: () => activateTab('snippet-vault') }));
        Store.getArticles().forEach(a => idx.push({ kind: 'Article', title: a.title, meta: a.author + ' · ' + a.readTime, icon: 'fa-newspaper', action: () => { activateTab('blog'); openArticleReader(a); } }));
        return idx;
    }

    function renderSearchResults(q) {
        const results = $('#search-results');
        if (!results) return;
        const index = buildSearchIndex();
        const query = (q || '').trim().toLowerCase();
        let list = query ? index.filter(it => (it.title + ' ' + it.meta + ' ' + it.kind).toLowerCase().includes(query)) : index;
        list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
        list = list.slice(0, 24);
        searchState.filtered = list;
        searchState.active = 0;
        if (!list.length) { results.innerHTML = `<div class="empty-hint" style="padding:1.25rem;text-align:center;">Aucun résultat pour « ${escapeHtml(q)} »</div>`; return; }
        let html = '', lastKind = null;
        list.forEach((it, i) => {
            if (it.kind !== lastKind) { html += `<div class="search-group-label">${it.kind}</div>`; lastKind = it.kind; }
            html += `<div class="search-result-item ${i === 0 ? 'is-active' : ''}" data-idx="${i}">
                <span class="result-icon"><i class="fa-solid ${it.icon}"></i></span>
                <div class="result-body"><div class="result-title">${escapeHtml(it.title)}</div><div class="result-meta">${escapeHtml(it.meta)}</div></div>
                <span class="result-kind">${it.kind}</span>
            </div>`;
        });
        results.innerHTML = html;
        $$('.search-result-item', results).forEach(el => {
            el.addEventListener('click', () => runSearchItem(parseInt(el.getAttribute('data-idx'), 10)));
            el.addEventListener('mousemove', () => setActiveResult(parseInt(el.getAttribute('data-idx'), 10)));
        });
    }

    function setActiveResult(i) {
        searchState.active = i;
        $$('#search-results .search-result-item').forEach(el => el.classList.toggle('is-active', parseInt(el.getAttribute('data-idx'), 10) === i));
    }
    function scrollActiveIntoView() {
        const el = $(`#search-results .search-result-item[data-idx="${searchState.active}"]`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }
    function runSearchItem(i) {
        const it = searchState.filtered[i];
        if (!it) return;
        closeSearch();
        it.action();
    }
    function openSearch() {
        const ov = $('#search-overlay');
        const input = $('#search-input');
        if (!ov) return;
        ov.hidden = false;
        renderSearchResults('');
        if (input) { input.value = ''; setTimeout(() => input.focus(), 30); }
    }
    function closeSearch() {
        const ov = $('#search-overlay');
        if (ov) ov.hidden = true;
    }
    function initSearch() {
        const trigger = $('#open-search');
        const ov = $('#search-overlay');
        const input = $('#search-input');
        if (trigger) trigger.addEventListener('click', openSearch);
        if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) closeSearch(); });
        if (input) {
            input.addEventListener('input', (e) => renderSearchResults(e.target.value));
            input.addEventListener('keydown', (e) => {
                const n = searchState.filtered.length;
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveResult(Math.min(n - 1, searchState.active + 1)); scrollActiveIntoView(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveResult(Math.max(0, searchState.active - 1)); scrollActiveIntoView(); }
                else if (e.key === 'Enter') { e.preventDefault(); runSearchItem(searchState.active); }
                else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
            });
        }
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); return; }
            if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
        });
    }

    // ======================================================================
    // 19. Global render + init
    // ======================================================================
    function renderAll() {
        renderHeaderUser();
        renderUserDropdown();
        renderLeaderboard();
        renderMatrix();
        renderSnippets();
        renderBadges();
        renderBlogFilters();
        renderArticles();
        renderDashboard();
        refreshFeedUI();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSidebar();
        initTheme();
        initNav();
        initUserSwitcher();
        initAddUser();
        initSkillTree();
        initClinique();
        initMatrixToolbar();
        initSnippets();
        initMasterIndex();
        initBlog();
        initDashboard();
        initNotifications();
        initSearch();
        renderAll();
        enterDashboard(); // premium skeleton reveal on first paint (dashboard is the default tab)
    });

})();
