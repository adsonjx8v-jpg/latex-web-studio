// ===== CONTEÚDO DOS ARQUIVOS =====
const files = {
    "main.tex": `% \documentclass{article}
% \usepackage[utf8]{inputenc}
% \usepackage{amsmath, amssymb, tcolorbox}

\title{Relatório de Pesquisa em Matemática Aplicada}
\author{Prof. Me. José Adson Reis Santos}
\date{\today}

\begin{document}

\maketitle

\section{1. Introdução}
Este documento foi compilado utilizando o ambiente LaTeX Web Studio. A equação fundamental da difusão ou calor é dada por:

\begin{equation}
\frac{\partial u}{\partial t} = \alpha \left( \frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} \right)
\end{equation}

Abaixo temos um exemplo de tabela estilizada com tcolorbox e pacotes avançados:

\begin{table}[h!]
    \centering
    \begin{tabular}{|l|c|r|}
        \hline
        Método & Erro Relativo & Tempo (s) \\
        \hline
        Diferenças Finitas & $1.42 \times 10^{-4}$ & 0.12 \\
        Elementos Finitos & $8.91 \times 10^{-6}$ & 0.45 \\
        \hline
    \end{tabular}
\end{table}

\end{document}`,
    "references.bib": `@article{santos2026,
    author = {Santos, José Adson Reis},
    title = {Aplicações de Equações Diferenciais Fracionárias},
    journal = {Revista Brasileira de Matemática Aplicada},
    year = {2026}
}`,
    "appendices.tex": `\appendix
\section{Apêndice A - Código Auxiliar em Python}
Para simulações numéricas, utilizamos o seguinte script em Python com NumPy e SciPy:

\begin{verbatim}
import numpy as np
import matplotlib.pyplot as plt

def solve_heat():
    print("Simulação numérica concluída.")
\end{verbatim}`
};

let currentFile = "main.tex";

// Elementos do DOM
const codeEditor = document.getElementById("code-editor");
const lineNumbers = document.getElementById("line-numbers");
const compileBtn = document.getElementById("compile-btn");
const autoCompileCheckbox = document.getElementById("auto-compile");
const consoleLogs = document.getElementById("console-logs");
const projectTitleInput = document.getElementById("project-title");
const saveStatus = document.getElementById("save-status");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const shareBtn = document.getElementById("share-btn");
const downloadBtn = document.getElementById("download-btn");
const shareModal = document.getElementById("share-modal");
const closeShareModal = document.getElementById("close-share-modal");
const copyLinkBtn = document.getElementById("copy-link-btn");
const fileItems = document.querySelectorAll(".file-item");

// Inicializar Editor com o arquivo padrão
codeEditor.value = files[currentFile];
updateLineNumbers();

// Atualizar Números de Linha
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
    files[currentFile] = codeEditor.value;
    
    // Status de salvamento simulado
    saveStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
    setTimeout(() => {
        saveStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Salvo';
    }, 800);

    if (autoCompileCheckbox.checked) {
        // Debounce automático de compilação
        clearTimeout(window.compileTimer);
        window.compileTimer = setTimeout(() => {
            compileProject(true);
        }, 1200);
    }
});

// Sincronizar scroll do editor com números de linha
codeEditor.addEventListener("scroll", () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Troca de Arquivos na Sidebar
fileItems.forEach(item => {
    item.addEventListener("click", () => {
        fileItems.forEach(f => f.classList.remove("active"));
        item.classList.add("active");
        
        const fileName = item.getAttribute("data-file");
        currentFile = fileName;
        codeEditor.value = files[currentFile] || "";
        updateLineNumbers();
        
        // Atualizar título do documento na aba
        document.querySelector(".tab").innerHTML = `<i class="fa-solid fa-file-code"></i> ${fileName} <span class="close-tab">&times;</span>`;
    });
});

// Simulação de Compilação
function compileProject(isAuto = false) {
    const timestamp = new Date().toLocaleTimeString();
    consoleLogs.innerHTML += `[${timestamp}] Compilando ${currentFile}...<br>`;
    consoleLogs.innerHTML += `[${timestamp}] Executando pdfLaTeX (TeX Live 2026)...<br>`;
    
    setTimeout(() => {
        const successTime = new Date().toLocaleTimeString();
        consoleLogs.innerHTML += `<span style="color: #34d399;">[${successTime}] Compilação concluída com sucesso! 0 erros, 0 avisos.</span><br>`;
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }, 600);
}

compileBtn.addEventListener("click", () => compileProject(false));

// Alternar Tema (Claro / Escuro)
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    if (document.body.classList.contains("light-theme")) {
        themeIcon.className = "fa-solid fa-sun";
    } else {
        themeIcon.className = "fa-solid fa-moon";
    }
});

// Modal de Compartilhamento
shareBtn.addEventListener("click", () => {
    shareModal.style.display = "flex";
});

closeShareModal.addEventListener("click", () => {
    shareModal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === shareModal) {
        shareModal.style.display = "none";
    }
});

copyLinkBtn.addEventListener("click", () => {
    const linkInput = document.getElementById("share-link-input");
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    copyLinkBtn.textContent = "Copiado!";
    setTimeout(() => {
        copyLinkBtn.textContent = "Copiar";
    }, 2000);
});

// Download do PDF simulado
downloadBtn.addEventListener("click", () => {
    alert("Compilando versão final em alta resolução e gerando download do PDF...");
    const blob = new Blob([codeEditor.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = projectTitleInput.value.replace(".tex", ".pdf");
    // Simula o download
    setTimeout(() => {
        alert("Arquivo PDF gerado e baixado com sucesso!");
    }, 1000);
});
