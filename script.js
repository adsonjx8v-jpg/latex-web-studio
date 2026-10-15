// Gerenciamento de Projetos com localStorage
const DEFAULT_PROJECTS = [
    {
        id: "proj_1",
        title: "Artigo_Cientifico_v1.tex",
        updatedAt: "Hoje, 14:30",
        content: `\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}

\title{Relatório de Pesquisa em Matemática Aplicada}
\author{Prof. Me. José Adson Reis Santos}
\date{\today}

\begin{document}
\maketitle

\section{1. Introdução}
Este documento foi compilado utilizando o ambiente LaTeX Web Studio.

\begin{equation}
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
\end{equation}

\end{document}`
    },
    {
        id: "proj_2",
        title: "Lista_Exercicios_Calculo.tex",
        updatedAt: "Ontem, 18:15",
        content: `\documentclass{exam}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}

\title{Lista de Exercícios - Cálculo III}
\author{Professor}

\begin{document}
\maketitle

\begin{questions}
\question Calcule a derivada da função $f(x) = x^3 \ln(x)$.
\question Resolva a EDO de primeira ordem:
\[ y' + 2xy = x \]
\end{questions}

\end{document}`
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

// Elementos da Dashboard
const dashboardView = document.getElementById("dashboard-view");
const editorView = document.getElementById("editor-view");
const projectsGrid = document.getElementById("projects-grid");
const newProjectBtn = document.getElementById("new-project-btn");
const searchProjectInput = document.getElementById("search-project");

// Elementos do Editor
const codeEditor = document.getElementById("code-editor");
const lineNumbers = document.getElementById("line-numbers");
const compileBtn = document.getElementById("compile-btn");
const autoCompileCheckbox = document.getElementById("auto-compile");
const consoleLogs = document.getElementById("console-logs");
const projectTitleInput = document.getElementById("project-title");
const saveStatus = document.getElementById("save-status");
const backToDashBtn = document.getElementById("back-to-dash");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleDash = document.getElementById("theme-toggle-dash");
const themeIcon = document.getElementById("theme-icon");
const themeIconDash = document.getElementById("theme-icon-dash");

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
                <p>LaTeX Document</p>
            </div>
            <div class="project-card-footer">
                <span>Modificado: ${proj.updatedAt}</span>
                <span style="color: #818cf8; font-weight: 500;">Abrir &rarr;</span>
            </div>
        `;
        card.addEventListener("click", () => openProject(proj.id));
        projectsGrid.appendChild(card);
    });
}

// Criar Novo Projeto
newProjectBtn.addEventListener("click", () => {
    const newId = "proj_" + Date.now();
    const newProj = {
        id: newId,
        title: "Novo_Documento_" + Math.floor(Math.random() * 1000) + ".tex",
        updatedAt: "Agora mesmo",
        content: `\documentclass{article}\n\begin{document}\n\section{Novo Projeto}\nEscreva seu texto aqui...\n\end{document}`
    };
    projects.push(newProj);
    saveProjects(projects);
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

// Voltar para a Dashboard
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

// Atualizar Números de Linha e Salvar
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
    
    // Salvar no estado atual e localStorage
    const proj = projects.find(p => p.id === currentProjectId);
    if (proj) {
        proj.content = codeEditor.value;
        proj.updatedAt = "Agora mesmo";
        saveProjects(projects);
    }

    saveStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
    setTimeout(() => {
        saveStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Salvo';
    }, 600);

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

// Compilação Simulado
function compileProject() {
    const timestamp = new Date().toLocaleTimeString();
    consoleLogs.innerHTML += `[${timestamp}] Compilando documento...<br>`;
    setTimeout(() => {
        consoleLogs.innerHTML += `<span style="color: #34d399;">[${timestamp}] Sucesso! 0 erros.</span><br>`;
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }, 500);
}

compileBtn.addEventListener("click", compileProject);

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

// Inicializar Dashboard
renderProjectsGrid();
