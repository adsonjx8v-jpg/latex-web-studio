// Templates LaTeX pré-definidos
const TEMPLATES = {
    article: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath, amssymb}

\\title{Artigo Científico}
\\author{Autor}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introdução}
Escreva sua introdução aqui...

\\end{document}`,

    exam: `\\documentclass{exam}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{Lista de Exercícios / Avaliação}
\\author{Professor}

\\begin{document}
\\maketitle

\\begin{questions}
\\question Resolva a equação diferencial:
\[ y' + y = 0 \\5
\\question Calcule a integral definida:
\[ \\int_{0}^{1} x^2 dx \\5
\\end{questions}

\\end{document}`,

    beamer: `\\documentclass{beamer}
\\usetheme{Madrid}

\\title{Apresentação de Slides}
\\author{Autor}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Introdução}
\\begin{itemize}
    \\item Tópico 1
    \\item Tópico 2
\\end{itemize}
\\end{frame}

\\end{document}`,

    empty: `\\documentclass{article}\\begin{document}Conteúdo em branco...\\end{document}`
};

// Gerenciamento de Projetos no localStorage e Google Drive
const DEFAULT_PROJECTS = [
    {
        id: "proj_1",
        title: "Artigo_Cientifico_v1.tex",
        updatedAt: "Hoje, 14:30",
        isDrive: false,
        content: TEMPLATES.article
    }
];

function getProjects() {
    const saved = localStorage.getItem("latex_projects");
    if (!saved) {
        localStorage.setItem("latex_projects", JSON.stringify(DEFAULT_PROJECTS));
        return DEFAULT_PROJECTS;
    }
    return JSON.parse(saved);
}

function saveProjects(projects) {
    localStorage.setItem("latex_projects", JSON.stringify(projects));
}

let currentProjectId = null;
let projects = getProjects();
let googleAccessToken = localStorage.getItem("google_access_token") || null;

// Elementos da Dashboard
const dashboardView = document.getElementById("dashboard-view");
const editorView = document.getElementById("editor-view");
const projectsGrid = document.getElementById("projects-grid");
const newProjectBtn = document.getElementById("new-project-btn");
const syncDriveBtn = document.getElementById("sync-drive-btn");
const googleAuthBtn = document.getElementById("google-auth-btn");
const authBtnText = document.getElementById("auth-btn-text");
const searchProjectInput = document.getElementById("search-project");

// Modal de Novo Projeto
const newProjectModal = document.getElementById("new-project-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const confirmCreateBtn = document.getElementById("confirm-create-btn");
const newProjNameInput = document.getElementById("new-proj-name");
const newProjTemplateSelect = document.getElementById("new-proj-template");

// Elementos do Editor
const codeEditor = document.getElementById("code-editor");
const lineNumbers = document.getElementById("line-numbers");
const compileBtn = document.getElementById("compile-btn");
const autoCompileCheckbox = document.getElementById("auto-compile");
const consoleLogs = document.getElementById("console-logs");
const projectTitleInput = document.getElementById("project-title");
const saveStatus = document.getElementById("save-status");
const backToDashBtn = document.getElementById("back-to-dash");
const saveDriveSingleBtn = document.getElementById("save-drive-single-btn");
const downloadBtn = document.getElementById("download-btn");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleDash = document.getElementById("theme-toggle-dash");
const themeIcon = document.getElementById("theme-icon");
const themeIconDash = document.getElementById("theme-icon-dash");

// Estado de Autenticação Google
if (googleAccessToken) {
    authBtnText.textContent = "Google Drive Conectado";
    googleAuthBtn.style.backgroundColor = "#10b981";
    syncDriveBtn.style.display = "inline-flex";
}

googleAuthBtn.addEventListener("click", () => {
    // Simulação ou chamada real de autenticação OAuth2 do Google
    const token = prompt("Insira seu Token OAuth2 do Google Drive (ou deixe em branco para simular conexão com sucesso):");
    if (token !== null) {
        googleAccessToken = token || "mock_google_token_xyz";
        localStorage.setItem("google_access_token", googleAccessToken);
        authBtnText.textContent = "Google Drive Conectado";
        googleAuthBtn.style.backgroundColor = "#10b981";
        syncDriveBtn.style.display = "inline-flex";
        alert("Conta Google conectada com sucesso! Agora você pode sincronizar e salvar no Google Drive.");
    }
});

// Renderizar Dashboard
function renderProjectsGrid(filter = "") {
    projectsGrid.innerHTML = "";
    const filtered = projects.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()));
    
    if (filtered.length === 0) {
        projectsGrid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1;">Nenhum projeto encontrado.</p>`;
        return;
    }

    filtered.forEach(proj => {
        const card = document.createElement("div");
        card.className = "project-card";
        card.innerHTML = `
            <div class="project-card-header">
                <div class="project-icon"><i class="fa-solid fa-file-code"></i></div>
                <button class="project-actions-menu" title="Excluir" onclick="deleteProject(event, '${proj.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="project-card-body">
                <h3>${proj.title}</h3>
                <p>Documento LaTeX</p>
            </div>
            <div class="project-card-footer">
                <span>${proj.updatedAt}</span>
                ${proj.isDrive ? '<span class="badge-drive"><i class="fa-brands fa-google-drive"></i> Drive</span>' : '<span style="color: #818cf8; font-weight: 500;">Abrir &rarr;</span>'}
            </div>
        `;
        card.addEventListener("click", () => openProject(proj.id));
        projectsGrid.appendChild(card);
    });
}

// Abrir Modal de Novo Projeto
newProjectBtn.addEventListener("click", () => {
    newProjectModal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => {
    newProjectModal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === newProjectModal) newProjectModal.style.display = "none";
});

// Confirmar Criação
confirmCreateBtn.addEventListener("click", () => {
    const title = newProjNameInput.value.trim() || "Novo_Documento.tex";
    const templateKey = newProjTemplateSelect.value;
    const content = TEMPLATES[templateKey] || TEMPLATES.article;

    const newId = "proj_" + Date.now();
    const newProj = {
        id: newId,
        title: title.endsWith(".tex") ? title : title + ".tex",
        updatedAt: "Agora mesmo",
        isDrive: false,
        content: content
    };

    projects.push(newProj);
    saveProjects(projects);
    newProjectModal.style.display = "none";
    openProject(newId);
});

// Abrir Projeto
function openProject(id) {
    currentProjectId = id;
    const proj = projects.find(p => p.id === id);
    if (!proj) return;

    projectTitleInput.value = proj.title;
    codeEditor.value = proj.content;
    updateLineNumbers();

    dashboardView.style.display = "none";
    editorView.style.display = "flex";
}

// Excluir Projeto
window.deleteProject = function(e, id) {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
        projects = projects.filter(p => p.id !== id);
        saveProjects(projects);
        renderProjectsGrid(searchProjectInput.value);
    }
}

// Voltar para Dashboard
backToDashBtn.addEventListener("click", () => {
    editorView.style.display = "none";
    dashboardView.style.display = "flex";
    projects = getProjects();
    renderProjectsGrid(searchProjectInput.value);
});

// Pesquisa
searchProjectInput.addEventListener("input", (e) => {
    renderProjectsGrid(e.target.value);
});

// Editor & Números de Linha
function updateLineNumbers() {
    const lines = codeEditor.value.split("\n").length;
    let numbersHTML = "";
    for (let i = 1; i <= lines; i++) {
        numbersHTML += i + "<br>";
    }
    lineNumbers.innerHTML = numbersHTML;
}

codeEditor.addEventListener("input", () => {
    updateLineNumbers();
    const proj = projects.find(p => p.id === currentProjectId);
    if (proj) {
        proj.content = codeEditor.value;
        proj.updatedAt = "Agora mesmo";
        saveProjects(projects);
    }

    saveStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
    setTimeout(() => {
        saveStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Salvo';
    }, 500);

    if (autoCompileCheckbox.checked) {
        clearTimeout(window.compileTimer);
        window.compileTimer = setTimeout(() => compileProject(), 1000);
    }
});

codeEditor.addEventListener("scroll", () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

projectTitleInput.addEventListener("input", () => {
    const proj = projects.find(p => p.id === currentProjectId);
    if (proj) {
        proj.title = projectTitleInput.value;
        saveProjects(projects);
    }
});

// Compilação Simulada
function compileProject() {
    const timestamp = new Date().toLocaleTimeString();
    consoleLogs.innerHTML += `[${timestamp}] Compilando documento LaTeX...<br>`;
    setTimeout(() => {
        consoleLogs.innerHTML += `<span style="color: #34d399;">[${timestamp}] Compilação bem-sucedida! 0 erros.</span><br>`;
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }, 500);
}

compileBtn.addEventListener("click", compileProject);

// Salvar no Google Drive
function saveToGoogleDrive() {
    if (!googleAccessToken) {
        alert("Por favor, conecte sua conta do Google Drive na página inicial primeiro.");
        return;
    }
    const proj = projects.find(p => p.id === currentProjectId);
    if (!proj) return;

    saveDriveSingleBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando...';
    
    // Simulação da chamada da API do Google Drive (Multipart Upload)
    setTimeout(() => {
        proj.isDrive = true;
        saveProjects(projects);
        saveDriveSingleBtn.innerHTML = '<i class="fa-brands fa-google-drive"></i> Salvo no Drive';
        alert(`Arquivo "${proj.title}" salvo com sucesso no seu Google Drive!`);
        setTimeout(() => {
            saveDriveSingleBtn.innerHTML = '<i class="fa-brands fa-google-drive"></i> Salvar no Drive';
        }, 2000);
    }, 1200);
}

saveDriveSingleBtn.addEventListener("click", saveToGoogleDrive);
syncDriveBtn.addEventListener("click", () => {
    alert("Sincronizando com o Google Drive... Todos os projetos locais foram atualizados na nuvem do Drive.");
});

// Download do arquivo .tex
downloadBtn.addEventListener("click", () => {
    const proj = projects.find(p => p.id === currentProjectId);
    const filename = proj ? proj.title : "documento.tex";
    const blob = new Blob([codeEditor.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
});

// Alternar Tema
function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    const iconClass = isLight ? "fa-solid fa-sun" : "fa-solid fa-moon";
    themeIcon.className = iconClass;
    themeIconDash.className = iconClass;
}

themeToggle.addEventListener("click", toggleTheme);
themeToggleDash.addEventListener("click", toggleTheme);

renderProjectsGrid();
