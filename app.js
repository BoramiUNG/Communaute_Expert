// ==========================================================================
// LineUp7 Guild Hub - Dynamic User Context & Skill Matrix Engine
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Initial State & Data Store ---
    const initialUsers = [
        {
            id: 'elian-m',
            name: 'Elian.M',
            role: 'Practice Lead & Mentor',
            avatar: 'EM',
            xp: 1450,
            level: 12,
            skills: {
                'sfmc-ampscript': 'Expert',
                'sfmc-ssjs-sql': 'Expert',
                'sfmc-deliverability': 'Expert',
                'sfmc-next-flows': 'Expert',
                'sf-datacloud-dmo': 'Expert',
                'sf-datacloud-insights': 'Expert',
                'agentforce-ia': 'Expert',
                'agentforce-mcp': 'Expert',
                'gcp-bigquery': 'Expert',
                'snowflake-data': 'Expert',
                'martech-audit': 'Expert'
            }
        },
        {
            id: 'hugo-s',
            name: 'Hugo.S',
            role: 'Data & Cloud Architect',
            avatar: 'HS',
            xp: 1120,
            level: 9,
            skills: {
                'gcp-bigquery': 'Expert',
                'snowflake-data': 'Expert',
                'dbt-modeling': 'Expert',
                'airflow-pipelines': 'Expert',
                'sf-datacloud-insights': 'Expert',
                'agentforce-mcp': 'Confirmé',
                'martech-audit': 'Expert'
            }
        },
        {
            id: 'yassine-k',
            name: 'Yassine.K',
            role: 'Salesforce & Data Specialist',
            avatar: 'YK',
            xp: 980,
            level: 8,
            skills: {
                'sf-datacloud-dmo': 'Expert',
                'sf-datacloud-insights': 'Expert',
                'sfmc-next-flows': 'Confirmé',
                'gcp-bigquery': 'Confirmé',
                'dbt-modeling': 'Confirmé',
                'agentforce-mcp': 'Confirmé',
                'martech-audit': 'Confirmé'
            }
        },
        {
            id: 'lucas-a',
            name: 'Lucas.A',
            role: 'MarTech Lead Consultant',
            avatar: 'LA',
            xp: 850,
            level: 7,
            skills: {
                'sfmc-ampscript': 'Expert',
                'sfmc-ssjs-sql': 'Expert',
                'sfmc-deliverability': 'Expert',
                'sfmc-next-flows': 'Confirmé',
                'sf-datacloud-dmo': 'Confirmé',
                'imagino-cdp': 'Confirmé'
            }
        },
        {
            id: 'borami-u',
            name: 'Borami.U',
            role: 'CDP & Imagino Expert',
            avatar: 'BU',
            xp: 780,
            level: 6,
            skills: {
                'imagino-cdp': 'Expert',
                'imagino-campaign': 'Expert',
                'sfmc-ampscript': 'Confirmé',
                'sfmc-deliverability': 'Confirmé'
            }
        },
        {
            id: 'yousra-b',
            name: 'Yousra.B',
            role: 'MarTech & Campaign Specialist',
            avatar: 'YB',
            xp: 720,
            level: 6,
            skills: {
                'sfmc-ampscript': 'Confirmé',
                'sfmc-deliverability': 'Expert',
                'imagino-campaign': 'Expert',
                'imagino-cdp': 'Confirmé'
            }
        }
    ];

    // Load from LocalStorage or initialize with auto-migration
    let loadedUsers = JSON.parse(localStorage.getItem('lineup7_guild_users'));
    if (!loadedUsers || loadedUsers.length === 0 || !loadedUsers[0].skills['sfmc-ampscript']) {
        loadedUsers = initialUsers;
        localStorage.setItem('lineup7_guild_users', JSON.stringify(initialUsers));
    }
    let users = loadedUsers;
    let currentUserId = localStorage.getItem('lineup7_current_user_id') || 'elian-m';

    // Helper to get active user
    function getCurrentUser() {
        return users.find(u => u.id === currentUserId) || users[0];
    }

    function saveState() {
        localStorage.setItem('lineup7_guild_users', JSON.stringify(users));
        localStorage.setItem('lineup7_current_user_id', currentUserId);
    }

    // --- 2. Tab Navigation ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const switchTabButtons = document.querySelectorAll('.switch-tab');

    function activateTab(tabId) {
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab')));
    });

    switchTabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            activateTab(btn.getAttribute('data-target'));
        });
    });

    // --- 3. User Switcher Dropdown & Active Profile Sync ---
    const userSwitcherContainer = document.getElementById('user-switcher-container');
    const userProfileTrigger = document.getElementById('user-profile-trigger');
    const dropdownUsersList = document.getElementById('dropdown-users-list');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUserName = document.getElementById('current-user-name');
    const currentUserRole = document.getElementById('current-user-role');
    const currentUserKarma = document.getElementById('current-user-karma');

    function renderHeaderUser() {
        const user = getCurrentUser();
        currentUserAvatar.textContent = user.avatar;
        currentUserName.textContent = user.name;
        currentUserRole.textContent = user.role;
        currentUserKarma.innerHTML = `<i class="fa-solid fa-hand-holding-heart"></i> Squad Member`;
    }

    function renderUserDropdown() {
        dropdownUsersList.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = `dropdown-user-item ${user.id === currentUserId ? 'active-user' : ''}`;
            item.innerHTML = `
                <div class="avatar-sm ${user.id === 'elian-m' ? 'primary' : ''}">${user.avatar}</div>
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <span style="font-weight: 700; font-size: 0.85rem;">${user.name}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${user.role}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                currentUserId = user.id;
                saveState();
                renderHeaderUser();
                renderUserDropdown();
                renderLeaderboard();
                userSwitcherContainer.classList.remove('open');
            });
            dropdownUsersList.appendChild(item);
        });
    }

    if (userProfileTrigger) {
        userProfileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userSwitcherContainer.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (!userSwitcherContainer.contains(e.target)) {
            userSwitcherContainer.classList.remove('open');
        }
    });

    // --- 4. Add New Participant Modal ---
    const addUserModal = document.getElementById('add-user-modal');
    const btnOpenAddUser = document.getElementById('btn-open-add-user-modal');
    const addUserForm = document.getElementById('add-user-form');

    if (btnOpenAddUser) {
        btnOpenAddUser.addEventListener('click', () => {
            userSwitcherContainer.classList.remove('open');
            addUserModal.classList.add('active');
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-user-name').value.trim();
            const role = document.getElementById('new-user-role').value.trim();
            const rawSkills = document.getElementById('new-user-skills').value.trim();

            if (!name || !role) return;

            const nameParts = name.split('.');
            const avatar = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
            const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

            const newUser = {
                id: newId,
                name: name,
                role: role,
                avatar: avatar,
                xp: 100,
                level: 1,
                skills: {}
            };

            if (rawSkills) {
                rawSkills.split(',').forEach(s => {
                    const skillKey = s.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                    newUser.skills[skillKey] = 'Confirmé';
                });
            }

            users.push(newUser);
            currentUserId = newId;
            saveState();

            renderHeaderUser();
            renderUserDropdown();
            renderLeaderboard();

            addUserModal.classList.remove('active');
            addUserForm.reset();
            alert(`Bienvenue dans la Guilde LineUp7, ${name} ! Votre profil est prêt.`);
        // --- 5. Skill Tree Nodes & Skill Assignment Inspector ---
    const nodeDetails = {
        'sfmc-core': { title: 'Marketing Cloud Engagement & AMPscript', desc: 'SQL Data Views, SSJS, Automation Studio, AMPscript & Délivrabilité', blueprints: ['LineUp7_SFMC_Audit_Checklist.pdf', 'SSJS_DataExtension_Cleanup_Snippet.js', 'LineUp7_AMPscript_CheatSheet.pdf'] },
        'sf-datacloud': { title: 'Salesforce Data Cloud & Insights', desc: 'DMO/DSO Modeling, Ingestion Streams, Calculated Insights, Identity Resolution', blueprints: ['DataCloud_DMO_Customer_Model_Template.drawio', 'Identity_Resolution_Rules_Guide.pdf', 'DataCloud_Calculated_Insights_RFM.sql'] },
        'agentforce-mcp': { title: 'Agentforce & Serveurs MCP', desc: 'AI Agents autonomes, Model Context Protocol, Endpoints d\'outils et connexions LLM', blueprints: ['MCP_Server_NodeJS_Boilerplate.zip', 'Agentforce_Prompt_Engineering_Rules.md'] },
        'imagino-cdp': { title: 'Imagino CDP & Golden Record', desc: 'Modélisation Data Client 360, Unification, déduplication & règles de Golden Record', blueprints: ['Imagino_GoldenRecord_Config_Recipe.json'] },
        'imagino-campaign': { title: 'Imagino Campaign & Triggers Temps Réel', desc: 'Orchestration cross-canal, Triggers API temps réel et activation d\'audiences', blueprints: ['Imagino_Campaign_Trigger_API_Spec.pdf'] },
        'gcp-bigquery': { title: 'GCP BigQuery & GCS MarTech', desc: 'Partitionnement, Ingestion GCS, Optimisation des coûts SQL BigQuery & Looker Studio', blueprints: ['BigQuery_Cost_Optimization_Checklist.md', 'GCS_Bucket_Sync_Script.sh'] },
        'snowflake-data': { title: 'Snowflake Data Cloud & Clean Rooms', desc: 'Zero-Copy Cloning, Secure Views, Data Clean Rooms et Data Sharing inter-entreprises', blueprints: ['Snowflake_ZeroCopy_Sharing_Recipe.sql'] },
        'dbt-modeling': { title: 'dbt (Data Build Tool) & Data Quality', desc: 'Transformations Jinja/SQL modulaires, Modèles incrémentaux & Data Quality Testing', blueprints: ['dbt_MarTech_Core_Project_Structure.zip'] },
        'airflow-pipelines': { title: 'Apache Airflow & Orchestration DAGs', desc: 'DAGs complexes, sync CRM/CDP, alertes Teams et retries automatiques', blueprints: ['Airflow_SFMC_Sync_DAG_Template.py'] },

        // Sub-skills alias
        'sfmc-ampscript': { title: 'AMPscript & Personnalisation Dynamique SFMC', desc: 'Scripting d\'emails dynamiques, Lookups d\'extensions, Content Blocks réutilisables & Fallbacks', blueprints: ['LineUp7_AMPscript_CheatSheet.pdf', 'Dynamic_Header_AMPscript_Template.html'] },
        'sfmc-ssjs-sql': { title: 'SSJS & SQL Data Views SFMC', desc: 'Automation Studio, Data Extensions temporaires, REST/SOAP APIs et scripts SSJS avancés', blueprints: ['SSJS_DataExtension_Cleanup_Snippet.js', 'SQL_DataViews_Query_Pack.sql'] },
        'sfmc-deliverability': { title: 'Délivrabilité & Configuration BU SFMC', desc: 'Sender Authentication Package (SAP), IP Warming, SPF/DKIM/DMARC, audit de réputation & Inbox Placement', blueprints: ['LineUp7_IP_Warming_Plan_4Weeks.xlsx', 'Deliverability_Audit_Checklist.pdf'] },
        'sfmc-next-flows': { title: 'Marketing Cloud Next & Salesforce Flows', desc: 'Orchestration par Salesforce Flows, Triggered Sending, Event-Driven Marketing & Data Cloud Actions', blueprints: ['MC_Next_Flow_Orchestration_Pattern.pdf'] },
        'sf-datacloud-dmo': { title: 'Salesforce Data Cloud DMO & Identity', desc: 'Modélisation DMO/DSO, Data Ingestion Streams, règles de réconciliation & Match Rules Customer 360', blueprints: ['DataCloud_DMO_Customer_Model_Template.drawio', 'Identity_Resolution_Rules_Guide.pdf'] },
        'sf-datacloud-insights': { title: 'Calculated Insights & Data Transforms', desc: 'Calculated Insights SQL, Streaming Data Transforms, métriques LTV/RFM et agrégats temps réel', blueprints: ['DataCloud_Calculated_Insights_RFM_Recipes.sql'] },
        'agentforce-ia': { title: 'Agentforce IA & Guardrails', desc: 'Agents autonomes Salesforce, Prompts, Active Governance & Agentforce Command Center', blueprints: ['Agentforce_Prompt_Engineering_Rules.md'] },
        'martech-audit': { title: 'Audit Technique & Quality Gate LineUp7', desc: 'Grille d\'évaluation d\'architecture MarTech, audit pré-livraison et conformité RGPD', blueprints: ['LineUp7_MarTech_Audit_QualityGate_Framework.xlsx'] }
    };

    const nodeModal = document.getElementById('node-modal');
    const nodeModalTitle = document.getElementById('node-modal-title');
    const nodeModalBody = document.getElementById('node-modal-body');
    const treeNodes = document.querySelectorAll('.tree-node');

    function openNodeInspector(nodeId) {
        const data = nodeDetails[nodeId];
        if (!data) return;

        const activeUser = getCurrentUser();
        const userLevelForSkill = activeUser.skills[nodeId] || activeUser.skills['sfmc-ampscript'] || 'Non déclarée';

        // Find all users having this skill or alias
        const membersWithSkill = users.filter(u => u.skills[nodeId] || (nodeId === 'sfmc-core' && (u.skills['sfmc-ampscript'] || u.skills['sfmc-ssjs-sql'])) || (nodeId === 'sf-datacloud' && (u.skills['sf-datacloud-dmo'] || u.skills['sf-datacloud-insights'])));

        nodeModalTitle.innerHTML = `<i class="fa-solid fa-microchip"></i> ${data.title}`;
        nodeModalBody.innerHTML = `
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">${data.desc}</p>

            <h4 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 0.75rem; color: var(--lineup7-green); font-family: Montserrat;">
                <i class="fa-solid fa-user-group"></i> Référents & Niveaux dans la Squad LineUp7 :
            </h4>
            <div style="margin-bottom: 1.25rem;">
                ${membersWithSkill.length === 0 ? '<p style="font-size: 0.8rem; color: var(--text-muted);">Aucun membre n\'a encore déclaré cette compétence.</p>' : ''}
                ${membersWithSkill.map(m => `
                    <div class="skill-badge-item">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="avatar-sm">${m.avatar}</div>
                            <span style="font-weight: 700; font-size: 0.85rem;">${m.name}</span>
                        </div>
                        <span class="skill-badge-level ${m.skills[nodeId] === 'Expert' ? 'level-expert' : m.skills[nodeId] === 'Confirmé' ? 'level-confirmed' : 'level-learning'}">
                            ${m.skills[nodeId]}
                        </span>
                    </div>
                `).join('')}
            </div>

            <!-- Active User Skill Assignment Control -->
            <div class="skill-assign-box">
                <h4 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main); font-family: Montserrat;">
                    <i class="fa-solid fa-user-gear"></i> Votre niveau actuels (${activeUser.name}) : 
                    <span style="color: var(--lineup7-green);">${userLevelForSkill}</span>
                </h4>
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
                    <select id="select-my-skill-level" style="flex: 1; background: rgba(16, 14, 37, 0.9); border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem;">
                        <option value="Confirmé" ${userLevelForSkill === 'Confirmé' ? 'selected' : ''}>Confirmé / Pratiquant</option>
                        <option value="Expert" ${userLevelForSkill === 'Expert' ? 'selected' : ''}>Expert / Référent</option>
                        <option value="En Apprentissage" ${userLevelForSkill === 'En Apprentissage' ? 'selected' : ''}>En Apprentissage</option>
                    </select>
                    <button class="btn btn-sm btn-primary" id="btn-save-my-skill" data-node-id="${nodeId}">
                        <i class="fa-solid fa-check"></i> Enregistrer (+100 XP)
                    </button>
                </div>
            </div>

            <div style="margin-top: 1.25rem;">
                <h4 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--accent-gold); font-family: Montserrat;">
                    <i class="fa-solid fa-file-code"></i> Blueprints & Assets disponibles :
                </h4>
                <ul style="list-style: none; font-size: 0.85rem;">
                    ${data.blueprints.map(b => `<li style="padding: 0.35rem 0; color: var(--lineup7-green); font-weight: 600;"><a href="#" onclick="alert('Ouverture du Blueprint sur SharePoint / Git LineUp7 : ${b}')" style="color: var(--lineup7-green); text-decoration: none;"><i class="fa-solid fa-file-arrow-down"></i> ${b} <span style="font-size: 0.7rem; color: var(--text-dim); margin-left: 0.5rem;">[SharePoint / Git]</span></a></li>`).join('')}
                </ul>
            </div>`;

        nodeModal.classList.add('active');

        // Attach Skill Save Event
        const btnSaveSkill = document.getElementById('btn-save-my-skill');
        if (btnSaveSkill) {
            btnSaveSkill.addEventListener('click', () => {
                const selectedLevel = document.getElementById('select-my-skill-level').value;
                const user = getCurrentUser();
                
                if (!user.skills[nodeId]) {
                    user.xp += 100; // Reward for declaring skill
                    user.level = Math.floor(user.xp / 100);
                }

                user.skills[nodeId] = selectedLevel;
                saveState();

                renderHeaderUser();
                renderUserDropdown();
                renderLeaderboard();
                openNodeInspector(nodeId); // Refresh modal view

                alert(`Compétence ${data.title} mise à jour (${selectedLevel}) pour ${user.name} !`);
            });
        }
    }

    treeNodes.forEach(node => {
        node.addEventListener('click', () => {
            const nodeId = node.getAttribute('data-node-id');
            openNodeInspector(nodeId);
        });
    });

    // --- 6. Modal Controls ---
    const submitModal = document.getElementById('submit-modal');
    const btnOpenSubmit = document.getElementById('btn-open-submit-modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    if (btnOpenSubmit) {
        btnOpenSubmit.addEventListener('click', () => submitModal.classList.add('active'));
    }

    // Global Modal Close Delegation (Guarantees any 'x' button or backdrop click closes active modal)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.closest('.close-modal')) {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        } else if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
            e.target.classList.remove('active');
        }
    });

    // --- 7. Form Submissions ---
    const incidentForm = document.getElementById('incident-form');
    const incidentsContainer = document.getElementById('incidents-container');
    const activeCountBadge = document.getElementById('active-incidents-count');

    if (incidentForm) {
        incidentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('inc-title').value;
            const desc = document.getElementById('inc-desc').value;
            const tech = document.getElementById('inc-tech').value;
            const user = getCurrentUser();

            const newCard = document.createElement('div');
            newCard.className = 'incident-card urgent';
            newCard.innerHTML = `
                <div class="incident-header">
                    <span class="badge-status open"><i class="fa-solid fa-circle"></i> À l'Ordre du jour</span>
                    <span class="incident-date">À l'instant</span>
                </div>
                <h3 class="incident-title">${title}</h3>
                <p class="incident-desc">${desc}</p>
                <div class="incident-tags">
                    <span class="tag">#${tech}</span>
                </div>
                <div class="incident-footer">
                    <div class="author">
                        <div class="avatar-sm primary">${user.avatar}</div>
                        <span>${user.name}</span>
                    </div>
                    <button class="btn btn-sm btn-outline btn-claim">
                        <i class="fa-solid fa-hand-holding-hand"></i> M'inscrire pour l'aider
                    </button>
                </div>
            `;

            incidentsContainer.prepend(newCard);
            submitModal.classList.remove('active');
            incidentForm.reset();

            if (activeCountBadge) {
                let current = parseInt(activeCountBadge.textContent) || 0;
                activeCountBadge.textContent = current + 1;
            }

            alert('Votre cas a été ajouté à la Clinique Tech !');
        });
    }

    // Delegate Clinique Tech Claim & Teams Meeting planning
    document.addEventListener('click', (e) => {
        const btnClaim = e.target.closest('.btn-claim');
        if (btnClaim) {
            const user = getCurrentUser();
            btnClaim.className = 'btn btn-sm btn-primary btn-teams-meet';
            btnClaim.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Planifier point Teams (15 min)`;
            alert(`Vous êtes inscrit comme Référent Helper (${user.name}) ! Vous pouvez planifier un point Teams de 15 min.`);
            return;
        }

        const btnTeams = e.target.closest('.btn-teams-meet');
        if (btnTeams) {
            const card = btnTeams.closest('.incident-card');
            const title = card ? card.querySelector('.incident-title').textContent : 'Clinique Tech LineUp7';
            const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent('Clinique Tech LineUp7 - Déblocage : ' + title)}&body=${encodeURIComponent('Bonjour,\n\nPrenons 15 minutes sur Teams pour résoudre ensemble ce point de blocage.\n\nCordialement,')}`;
            window.open(outlookUrl, '_blank');
        }
    });

    // Add Snippet Modal Logic
    const addSnippetModal = document.getElementById('add-snippet-modal');
    const btnOpenAddSnippet = document.getElementById('btn-open-add-snippet-modal');
    const addSnippetForm = document.getElementById('add-snippet-form');

    if (btnOpenAddSnippet && addSnippetModal) {
        btnOpenAddSnippet.addEventListener('click', () => addSnippetModal.classList.add('active'));
    }

    if (addSnippetForm) {
        addSnippetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('new-snip-title').value.trim();
            const category = document.getElementById('new-snip-cat').value;
            const desc = document.getElementById('new-snip-desc').value.trim();
            const code = document.getElementById('new-snip-code').value.trim();

            if (!title || !code) return;

            const newSnippet = {
                id: 'snip-' + Date.now(),
                category: category,
                title: title,
                desc: desc,
                code: code
            };

            snippetsData.unshift(newSnippet);
            renderSnippets('all');
            addSnippetModal.classList.remove('active');
            addSnippetForm.reset();
            alert(`Snippet "${title}" ajouté avec succès au Snippet Vault !`);
        });
    }

    const docForm = document.getElementById('doc-generator-form');
    const masterTableBody = document.getElementById('master-table-body');

    if (docForm) {
        docForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('gen-title').value;
            const tags = document.getElementById('gen-tags').value;
            const user = getCurrentUser();
            
            user.xp += 50;
            saveState();
            renderHeaderUser();

            const today = new Date().toLocaleDateString('fr-FR');
            const tagsHtml = tags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join(' ');
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${today}</td>
                <td>${title}</td>
                <td>${tagsHtml}</td>
                <td>${user.name}</td>
                <td><a href="#" class="index-link" onclick="alert('Fiche Loop Teams ouverte !')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Fiche Loop #NEW</a></td>
            `;

            masterTableBody.prepend(newRow);
            docForm.reset();

            alert(`Fiche Loop générée et publiée par ${user.name} ! +50 XP Karma accordés 🎉`);
            activateTab('master-index');
        });
    }

    // Matrix Horizontal Scroll Control Buttons
    const btnScrollLeft = document.getElementById('btn-scroll-matrix-left');
    const btnScrollRight = document.getElementById('btn-scroll-matrix-right');
    const tableContainer = document.querySelector('.table-container');

    if (btnScrollLeft && tableContainer) {
        btnScrollLeft.addEventListener('click', () => {
            tableContainer.scrollBy({ left: -350, behavior: 'smooth' });
        });
    }

    if (btnScrollRight && tableContainer) {
        btnScrollRight.addEventListener('click', () => {
            tableContainer.scrollBy({ left: 350, behavior: 'smooth' });
        });
    }

    // --- 8. Render Matrix Table (Squad x Technos) ---
    function renderMatrix() {
        const matrixBody = document.getElementById('matrix-table-body');
        if (!matrixBody) return;

        const techKeys = [
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

        matrixBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            let cellsHtml = `<td style="text-align: left; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                <div class="avatar-sm ${user.id === 'elian-m' ? 'primary' : ''}">${user.avatar}</div> ${user.name}
            </td>`;

            techKeys.forEach(t => {
                const level = user.skills[t.key];
                let badgeHtml = '';
                if (level === 'Expert') {
                    badgeHtml = `<span class="matrix-cell-badge level-expert"><i class="fa-solid fa-star"></i> Expert</span>`;
                } else if (level === 'Confirmé') {
                    badgeHtml = `<span class="matrix-cell-badge level-confirmed">Confirmé</span>`;
                } else if (level === 'En Apprentissage') {
                    badgeHtml = `<span class="matrix-cell-badge level-learning">Apprenti</span>`;
                } else {
                    badgeHtml = `<span style="color: var(--text-dim); font-size: 0.75rem;">-</span>`;
                }

                cellsHtml += `<td class="matrix-cell-editable" data-user-id="${user.id}" data-skill-key="${t.key}" title="Cliquer pour modifier l'expertise de ${user.name}">${badgeHtml}</td>`;
            });

            tr.innerHTML = cellsHtml;
            matrixBody.appendChild(tr);
        });

        // Attach Cell Click Event for interactive level modification
        document.querySelectorAll('.matrix-cell-editable').forEach(cell => {
            cell.addEventListener('click', () => {
                const userId = cell.getAttribute('data-user-id');
                const skillKey = cell.getAttribute('data-skill-key');
                const targetUser = users.find(u => u.id === userId);
                if (!targetUser) return;

                const currentLevel = targetUser.skills[skillKey];
                let nextLevel = 'Confirmé';
                if (!currentLevel) nextLevel = 'Confirmé';
                else if (currentLevel === 'Confirmé') nextLevel = 'Expert';
                else if (currentLevel === 'Expert') nextLevel = 'En Apprentissage';
                else if (currentLevel === 'En Apprentissage') nextLevel = null;

                if (nextLevel) {
                    targetUser.skills[skillKey] = nextLevel;
                } else {
                    delete targetUser.skills[skillKey];
                }

                saveState();
                renderMatrix();
                renderLeaderboard();
            });
        });
    }

    // --- 9. Snippet Vault Engine & 1-Click Copy ---
    const snippetsData = [
        {
            id: 'snip-ampscript',
            category: 'SFMC',
            title: 'AMPscript Lookup & Dynamic Header Personalization',
            desc: 'Scripting d\'emailing dynamique sécurisé avec fallback automatique si l\'attribut prénom/profil est absent.',
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
Bonjour %%=v(@firstName)=%%, votre statut est %%=v(@tier)=%%.`
        },
        {
            id: 'snip-insights',
            category: 'DataCloud',
            title: 'Calculated Insight Data Cloud (Score RFM & Recency)',
            desc: 'Calculated Insight SQL dans Salesforce Data Cloud pour calculer le montant total dépensé et la récence d\'achat.',
            code: `SELECT 
    Individual__dlm.Id__c AS CustomerId__c,
    MAX(SalesOrder__dlm.PurchaseDate__c) AS LastPurchaseDate__c,
    SUM(SalesOrder__dlm.GrandTotalAmount__c) AS TotalLifetimeValue__c,
    COUNT(SalesOrder__dlm.Id__c) AS TotalOrderCount__c
FROM Individual__dlm
JOIN SalesOrder__dlm ON Individual__dlm.Id__c = SalesOrder__dlm.CustomerId__c
GROUP BY Individual__dlm.Id__c`
        },
        {
            id: 'snip-mcp',
            category: 'MCP',
            title: 'Serveur MCP Node.js (Boilerplate Agentforce)',
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
}));`
        },
        {
            id: 'snip-sfmc',
            category: 'SFMC',
            title: 'Script SSJS Purge Data Extension SFMC',
            desc: 'Script SSJS générique pour purger les lignes d\'une DE temporaire sans impacter l\'Automation Studio.',
            code: `<script runat="server">
Platform.Load("Core", "1.1.1");
var deName = "DE_Audience_Temp_LineUp7";
var api = DataExtension.Init(deName);
var status = api.Rows.Clear();
Write("Purger terminée avec succès.");
</script>`
        },
        {
            id: 'snip-bq',
            category: 'GCP',
            title: 'Requête BigQuery SQL Optimisée (Partition & Clustered)',
            desc: 'Requête d\'export d\'audiences volumineuses filtrée sur les 30 derniers jours avec zéro surcoût de scan.',
            code: `SELECT customer_id, email, SUM(order_amount) AS total_spent
FROM \`lineup7_data_warehouse.orders\`
WHERE _PARTITIONDATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY customer_id, email
HAVING total_spent > 150
ORDER BY total_spent DESC;`
        },
        {
            id: 'snip-dbt',
            category: 'dbt',
            title: 'Modèle dbt Incrémental Imagino ➔ BigQuery',
            desc: 'Transformation Jinja SQL incrémentale pour dédupliquer les profils clients unifiés.',
            code: `{{ config(materialized='incremental', unique_key='customer_id') }}

SELECT customer_id, email, updated_at
FROM {{ ref('stg_imagino_users') }}
{% if is_incremental() %}
  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}`
        }
    ];

    function renderSnippets(filter = 'all') {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        const filtered = filter === 'all' ? snippetsData : snippetsData.filter(s => s.category === filter);
        container.innerHTML = '';

        filtered.forEach(s => {
            const card = document.createElement('div');
            card.className = 'snippet-card';
            card.innerHTML = `
                <div>
                    <div class="snippet-header">
                        <span class="tag">#${s.category}</span>
                        <span style="font-size: 0.72rem; color: var(--text-dim);"><i class="fa-solid fa-code"></i> Template LineUp7</span>
                    </div>
                    <h3 class="snippet-title">${s.title}</h3>
                    <p class="snippet-desc">${s.desc}</p>
                    <div class="code-block-wrapper">
                        <button class="btn-copy-code" data-code="${encodeURIComponent(s.code)}">
                            <i class="fa-solid fa-copy"></i> Copier
                        </button>
                        <pre><code>${escapeHtml(s.code)}</code></pre>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Attach Copy Event
        document.querySelectorAll('.btn-copy-code').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = decodeURIComponent(btn.getAttribute('data-code'));
                navigator.clipboard.writeText(code).then(() => {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
                    setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copier', 2000);
                });
            });
        });
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Filter Buttons logic for Snippet Vault
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.getAttribute('data-filter');
            renderSnippets(category);
        });
    });

    // --- 10. Search & Squad Profile Modal Rendering ---
    const userDetailModal = document.getElementById('user-detail-modal');
    const userDetailTitle = document.getElementById('user-detail-modal-title');
    const userDetailBody = document.getElementById('user-detail-modal-body');

    function openUserDetailModal(user) {
        if (!userDetailModal) return;
        userDetailTitle.innerHTML = `<i class="fa-solid fa-id-card"></i> Profil Squad : ${user.name}`;
        
        const skillsKeys = Object.keys(user.skills);
        const skillsList = skillsKeys.map(k => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.35rem; border: 1px solid var(--border-color);">
                <span style="font-weight: 700; font-size: 0.82rem;">#${k}</span>
                <span class="matrix-cell-badge ${user.skills[k] === 'Expert' ? 'level-expert' : 'level-confirmed'}">${user.skills[k]}</span>
            </div>
        `).join('');

        userDetailBody.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div class="avatar" style="width: 52px; height: 52px; font-size: 1.1rem;">${user.avatar}</div>
                <div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; font-family: Montserrat; color: var(--text-main);">${user.name}</h3>
                    <span style="font-size: 0.82rem; color: var(--lineup7-green); font-weight: 600;">${user.role}</span>
                </div>
            </div>

            <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--lineup7-green); margin-bottom: 0.6rem; font-family: Montserrat;">
                <i class="fa-solid fa-layer-group"></i> Compétences Déclarées & Niveaux :
            </h4>
            <div style="margin-bottom: 1.25rem;">
                ${skillsList || '<p style="font-size: 0.8rem; color: var(--text-muted);">Aucune compétence déclarée pour le moment.</p>'}
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm btn-primary" id="btn-switch-to-user" data-user-id="${user.id}">
                    <i class="fa-solid fa-right-to-bracket"></i> Incarner ce profil (${user.name})
                </button>
            </div>
        `;

        userDetailModal.classList.add('active');

        const btnSwitch = document.getElementById('btn-switch-to-user');
        if (btnSwitch) {
            btnSwitch.addEventListener('click', () => {
                currentUserId = user.id;
                saveState();
                renderHeaderUser();
                renderUserDropdown();
                renderLeaderboard();
                userDetailModal.classList.remove('active');
                alert(`Vous êtes maintenant connecté en tant que ${user.name}`);
            });
        }
    }

    function renderLeaderboard() {
        const leaderList = document.querySelector('.leader-list');
        if (!leaderList) return;

        leaderList.innerHTML = '';
        users.forEach(u => {
            const li = document.createElement('li');
            li.className = `leader-item ${u.id === currentUserId ? 'rank-1' : ''}`;
            const userSkillsList = Object.keys(u.skills).map(s => `#${s}`).slice(0, 3).join(' ');
            li.innerHTML = `
                <div class="avatar-sm ${u.id === 'elian-m' ? 'primary' : ''}">${u.avatar}</div>
                <div class="leader-details">
                    <span class="name">${u.name} ${u.id === currentUserId ? '<span class="badge-tag" style="font-size: 0.6rem;">VOUS</span>' : ''}</span>
                    <span class="role">${u.role}</span>
                    <span style="font-size: 0.7rem; color: var(--lineup7-green); font-family: monospace;">${userSkillsList}</span>
                </div>
                <span class="badge-tag" style="background: rgba(50, 172, 92, 0.15); color: var(--lineup7-green); font-size: 0.72rem;"><i class="fa-solid fa-user"></i> Voir Profil</span>
            `;
            li.addEventListener('click', () => openUserDetailModal(u));
            leaderList.appendChild(li);
        });
    }

    const searchInput = document.getElementById('search-index');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = masterTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        });
    }

    // --- 11. Blog & LinkedIn Articles Engine ---
    const initialArticles = [
        {
            id: 'art-mcp-2026',
            title: 'Pourquoi le Model Context Protocol (MCP) redéfinit l\'architecture MarTech en 2026',
            author: 'Elian Maufras',
            authorAvatar: 'EM',
            date: '30/07/2026',
            readTime: '4 min',
            tags: '#Agentforce #MCP #MarTech #Salesforce',
            summary: 'Comment la suppression des intégrations N x M au profit de serveurs MCP gouvernés permet aux agents IA d\'interroger le Customer 360 sans dette technique.',
            content: `### 🤖 Pourquoi le Model Context Protocol (MCP) redéfinit l'architecture MarTech

Sur nos projets MarTech récents chez **LineUP7**, une problématique revient systématiquement : *comment donner à des agents IA (type Agentforce) un accès sécurisé et temps réel aux données clients sans multiplier les connecteurs ad-hoc ?*

C'est ici qu'intervient le **Model Context Protocol (MCP)**, le standard open-source adopté par Salesforce.

#### 💡 Les 3 piliers de l'architecture MCP chez LineUp7 :
1. **Adieu la dette d'intégration N x M** : Plus besoin d'écrire une API spécifique par outil. Un serveur MCP expose des "Tools" standardisés que tout LLM/Agent peut consommer.
2. **Sécurité & Context Grounding** : L'agent IA n'hallucine plus. Il interroge Data Cloud ou Snowflake sous contrôle strict des politiques de gouvernance d'entreprise.
3. **Découplage Front/Back** : Nos équipes MarTech peuvent brancher un serveur MCP Node.js ou Python en quelques heures sur un projet client.

---
🚀 *Vous déployez Agentforce ou Data Cloud dans votre organisation ? Parlons-en en commentaire !*

#LineUp7 #MarTech #Agentforce #Salesforce #MCP #DataCloud #AI`
        },
        {
            id: 'art-datacloud-zero-copy',
            title: 'Salesforce Data Cloud : Réussir l\'Identity Resolution sans dupliquer vos données (Zero-Copy)',
            author: 'Yassine.K & Hugo.S',
            authorAvatar: 'YK',
            date: '28/07/2026',
            readTime: '5 min',
            tags: '#DataCloud #Snowflake #GCP #ZeroCopy',
            summary: 'Analyse d\'une architecture Zero-Copy Federated Grounding entre BigQuery, Snowflake et Salesforce Data Cloud.',
            content: `### ⚡ Identity Resolution & Zero-Copy : La nouvelle norme Data Cloud

Pourquoi dupliquer des gigaoctets de données de votre Data Warehouse (BigQuery / Snowflake) vers votre CDP quand vous pouvez utiliser le **Zero-Copy Data Sharing** ?

#### 🔑 Retour d'expérience de l'équipe Data LineUp7 :
* **Federated Grounding** : Data Cloud interroge directement les tables externes Snowflake sans pipeline ETL lourd.
* **Match Rules d'Identity Resolution** : Réconciliation omnicanale basée sur les identifiants unifiés (Email hash, Device ID, CRM ID).
* **Réduction de 40% des coûts d'ingestion** : Moins de volumes transférés = réduction immédiate de la facture Cloud.

---
💡 *Une question sur la modélisation DMO/DSO ? L'équipe MarTech & Data LineUp7 est à votre disposition.*

#DataCloud #Snowflake #BigQuery #IdentityResolution #LineUp7`
        },
        {
            id: 'art-imagino-vs-sf',
            title: 'Imagino CDP vs Salesforce Data Cloud : Quel moteur choisir selon la maturité client ?',
            author: 'Borami.U & Lucas.A',
            authorAvatar: 'BU',
            date: '20/07/2026',
            readTime: '3 min',
            tags: '#Imagino #CDP #MarTech #Architecture',
            summary: 'Comparatif pragmatique des cas d\'usage : quand privilégier une CDP Pure-Play agile comme Imagino face à un géant comme Data Cloud.',
            content: `### 🎯 Imagino CDP vs Salesforce Data Cloud : Le bon choix d'architecture

Toutes les entreprises n'ont pas besoin du même niveau de complexité pour unifier leur profil client 360.

#### 📊 Le comparatif terrain LineUp7 :
* **Imagino CDP** : Idéal pour les équipes marketing recherchant une agilité extrême, une mise en production rapide (Time-to-Market < 2 mois) et une gestion intuitive du Golden Record.
* **Salesforce Data Cloud** : Incontournable pour les écosystèmes complexes multi-BU, fortement intégrés à Salesforce Core et nécessitant l'utilisation d'Agentforce IA.

---
🤝 *Besoin d'un cadrage neutre sur le choix de votre CDP ? Contactez nos experts chez LineUp7 !*

#Imagino #CDP #MarTech #LineUp7 #Salesforce`
        }
    ];

    let articles = JSON.parse(localStorage.getItem('lineup7_guild_articles')) || initialArticles;

    function renderArticles() {
        const container = document.getElementById('articles-container');
        if (!container) return;

        container.innerHTML = '';
        articles.forEach(art => {
            const card = document.createElement('div');
            card.className = 'snippet-card';
            card.innerHTML = `
                <div>
                    <div class="snippet-header">
                        <span class="tag">${art.tags.split(' ')[0]}</span>
                        <span style="font-size: 0.75rem; color: var(--lineup7-green); font-weight: 700;"><i class="fa-solid fa-clock"></i> ${art.readTime}</span>
                    </div>
                    <h3 class="snippet-title">${art.title}</h3>
                    <p class="snippet-desc">${art.summary}</p>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="avatar-sm primary">${art.authorAvatar}</div>
                            <span style="font-size: 0.8rem; font-weight: 700;">${art.author}</span>
                        </div>
                        <button class="btn btn-sm btn-outline btn-read-article" data-article-id="${art.id}">
                            <i class="fa-brands fa-linkedin" style="color: #0a66c2;"></i> Lire & Copier
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Attach Read Click
        document.querySelectorAll('.btn-read-article').forEach(btn => {
            btn.addEventListener('click', () => {
                const artId = btn.getAttribute('data-article-id');
                const article = articles.find(a => a.id === artId);
                if (article) openArticleReader(article);
            });
        });
    }

    const articleReaderModal = document.getElementById('article-reader-modal');
    const readerTitle = document.getElementById('reader-article-title');
    const readerBody = document.getElementById('reader-article-body');

    function openArticleReader(art) {
        if (!articleReaderModal) return;
        readerTitle.innerHTML = `<i class="fa-brands fa-linkedin" style="color: #0a66c2;"></i> Article : ${art.title}`;
        
        // Simple Markdown parsing for preview
        const formattedHtml = art.content
            .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.1rem; font-weight: 800; color: var(--lineup7-green); margin: 1rem 0 0.5rem;">$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0.8rem 0 0.4rem;">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '<br><br>');

        readerBody.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; background: rgba(255,255,255,0.02); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="avatar-sm primary">${art.authorAvatar}</div>
                    <div>
                        <span style="font-weight: 800; font-size: 0.85rem;">${art.author}</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Publié le ${art.date}</span>
                    </div>
                </div>
                <span class="tag" style="background: rgba(10, 102, 194, 0.15); color: #0a66c2; border-color: rgba(10, 102, 194, 0.3);">${art.tags}</span>
            </div>

            <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-muted); background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                ${formattedHtml}
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-sm btn-outline" id="btn-download-md" data-article-id="${art.id}">
                    <i class="fa-solid fa-download"></i> Télécharger .md
                </button>
                <button class="btn btn-sm btn-primary" id="btn-copy-linkedin-post" data-article-id="${art.id}">
                    <i class="fa-brands fa-linkedin"></i> Copier le post pour LinkedIn
                </button>
            </div>
        `;

        articleReaderModal.classList.add('active');

        // Copy for LinkedIn
        document.getElementById('btn-copy-linkedin-post').addEventListener('click', () => {
            navigator.clipboard.writeText(art.content).then(() => {
                alert('Post Markdown copié dans le presse-papier ! Prêt à être collé sur LinkedIn 🎉');
            });
        });

        // Download MD
        document.getElementById('btn-download-md').addEventListener('click', () => {
            const blob = new Blob([art.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LineUp7_Article_${art.id}.md`;
            a.click();
        });
    }

    // Add Article Modal Logic
    const addArticleModal = document.getElementById('add-article-modal');
    const btnOpenAddArticle = document.getElementById('btn-open-add-article-modal');
    const addArticleForm = document.getElementById('add-article-form');

    if (btnOpenAddArticle && addArticleModal) {
        btnOpenAddArticle.addEventListener('click', () => addArticleModal.classList.add('active'));
    }

    if (addArticleForm) {
        addArticleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('new-art-title').value.trim();
            const tag = document.getElementById('new-art-tag').value.trim();
            const readTime = document.getElementById('new-art-time').value.trim();
            const content = document.getElementById('new-art-content').value.trim();
            const user = getCurrentUser();

            if (!title || !content) return;

            const newArticle = {
                id: 'art-' + Date.now(),
                title: title,
                author: user.name,
                authorAvatar: user.avatar,
                date: new Date().toLocaleDateString('fr-FR'),
                readTime: readTime,
                tags: tag,
                summary: content.substring(0, 120) + '...',
                content: content
            };

            articles.unshift(newArticle);
            localStorage.setItem('lineup7_guild_articles', JSON.stringify(articles));
            renderArticles();
            addArticleModal.classList.remove('active');
            addArticleForm.reset();
            alert(`Article "${title}" publié dans la Guilde ! Prêt pour le partage LinkedIn.`);
        });
    }

    // Initialize UI Views
    renderHeaderUser();
    renderUserDropdown();
    renderLeaderboard();
    renderMatrix();
    renderSnippets();
    renderArticles();

});
