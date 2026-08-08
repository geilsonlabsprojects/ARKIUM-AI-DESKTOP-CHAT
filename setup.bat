@echo off
setlocal EnableDelayedExpansion
title ARKIUM AI Desktop Chat - Setup Automatico
color 0A
chcp 65001 >nul 2>&1

echo.
echo ==========================================
echo   ARKIUM AI Desktop Chat - Setup
echo ==========================================
echo.

set ERRORS=0
set RUST_INSTALLED_NOW=0

:: ── Adicionar cargo ao PATH desta sessao ─────────────────────────────────────
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

:: ─────────────────────────────────────────────────────────────────────────────
:: [1/5] Node.js
:: ─────────────────────────────────────────────────────────────────────────────
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js nao encontrado. Instalando via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    :: Recarregar PATH
    for /f "tokens=*" %%i in ('powershell -Command "[Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")+\";\"+ [Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"') do set "PATH=%%i"
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo   [!] Node.js instalado. Reabra este terminal e execute setup.bat novamente.
        pause & exit /b 0
    )
)
for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v

:: ─────────────────────────────────────────────────────────────────────────────
:: [2/5] Rust
:: ─────────────────────────────────────────────────────────────────────────────
echo [2/5] Verificando Rust...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   Rust nao encontrado. Baixando e instalando automaticamente...
    echo   (pode demorar 5-10 minutos dependendo da internet)
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   [ERRO] Falha ao baixar Rust. Verifique a conexao.
        set ERRORS=1
        goto :SKIP_RUST
    )
    "%TEMP%\rustup-init.exe" -y --default-toolchain stable --profile minimal
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
    rustc --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo   [!] Rust instalado. Reabra este terminal e execute setup.bat novamente.
        pause & exit /b 0
    )
    set RUST_INSTALLED_NOW=1
)
for /f "tokens=*" %%v in ('rustc --version') do echo   [OK] Rust %%v
:SKIP_RUST

:: ─────────────────────────────────────────────────────────────────────────────
:: [3/5] WebView2 (necessario para Tauri no Windows)
:: ─────────────────────────────────────────────────────────────────────────────
echo [3/5] Verificando WebView2 Runtime...
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" >nul 2>&1
if %errorlevel% neq 0 (
    reg query "HKCU\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" >nul 2>&1
)
if %errorlevel% neq 0 (
    echo   Instalando Microsoft Edge WebView2 Runtime...
    powershell -Command "Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile '%TEMP%\webview2.exe'" >nul 2>&1
    "%TEMP%\webview2.exe" /silent /install >nul 2>&1
    echo   [OK] WebView2 instalado
) else (
    echo   [OK] WebView2 Runtime disponivel
)

:: ─────────────────────────────────────────────────────────────────────────────
:: [4/5] npm install
:: ─────────────────────────────────────────────────────────────────────────────
echo [4/5] Instalando dependencias Node.js...
:: Garantir que scripts PowerShell possam rodar (necessario para npm)
powershell -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force" >nul 2>&1

if not exist "node_modules" (
    echo   Executando npm install (pode demorar alguns minutos)...
) else (
    echo   Atualizando dependencias...
)
call npm install
if %errorlevel% neq 0 (
    echo   [ERRO] npm install falhou.
    set ERRORS=1
) else (
    echo   [OK] Dependencias instaladas com sucesso
)

:: ─────────────────────────────────────────────────────────────────────────────
:: [5/5] Ollama
:: ─────────────────────────────────────────────────────────────────────────────
echo [5/5] Verificando Ollama...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   +--------------------------------------------------+
    echo   ^|  Ollama nao encontrado                           ^|
    echo   ^|  O Ollama e necessario para usar a IA local.    ^|
    echo   ^|                                                  ^|
    echo   ^|  Deseja instalar o Ollama agora? [S/N]          ^|
    echo   +--------------------------------------------------+
    set /p INST_OLLAMA="  Escolha: "
    if /i "!INST_OLLAMA!"=="S" (
        echo   Baixando Ollama...
        powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%TEMP%\OllamaSetup.exe'"
        echo   Instalando Ollama...
        start /wait "%TEMP%\OllamaSetup.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
        for /f "tokens=*" %%i in ('powershell -Command "[Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")+\";\"+ [Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"') do set "PATH=%%i"
        ollama --version >nul 2>&1
        if !errorlevel! neq 0 (
            echo   [!] Ollama instalado. Reabra o terminal para ativar.
        ) else (
            echo   [OK] Ollama instalado
            :: Iniciar servico em background
            start /b "" ollama serve >nul 2>&1
            timeout /t 3 /nobreak >nul
        )
    ) else (
        echo   Ollama ignorado. Instale depois em: https://ollama.ai
    )
) else (
    for /f "tokens=*" %%v in ('ollama --version 2^>nul') do echo   [OK] Ollama %%v

    :: Verificar se ha modelos instalados
    echo   Verificando modelos IA...
    :: Garantir que ollama serve esteja rodando
    ollama list >nul 2>&1
    if !errorlevel! neq 0 (
        start /b "" ollama serve >nul 2>&1
        timeout /t 3 /nobreak >nul
    )

    set MODELS_COUNT=0
    for /f "skip=1 tokens=1" %%m in ('ollama list 2^>nul') do (
        set /a MODELS_COUNT+=1
    )

    if !MODELS_COUNT! equ 0 (
        echo.
        echo   +--------------------------------------------------+
        echo   ^|  Nenhum modelo IA instalado                      ^|
        echo   ^|                                                   ^|
        echo   ^|  Escolha um modelo para baixar:                  ^|
        echo   ^|                                                   ^|
        echo   ^|   1) llama3.2    (~2 GB) - Rapido e capaz        ^|
        echo   ^|   2) phi3        (~2 GB) - Leve e eficiente      ^|
        echo   ^|   3) mistral     (~4 GB) - Qualidade superior    ^|
        echo   ^|   4) Pular - instalar depois na aba Models       ^|
        echo   +--------------------------------------------------+
        set /p MODEL_CHOICE="  Escolha [1/2/3/4]: "

        if "!MODEL_CHOICE!"=="1" (
            echo   Baixando llama3.2...
            ollama pull llama3.2
        ) else if "!MODEL_CHOICE!"=="2" (
            echo   Baixando phi3...
            ollama pull phi3
        ) else if "!MODEL_CHOICE!"=="3" (
            echo   Baixando mistral...
            ollama pull mistral
        ) else (
            echo   Voce pode baixar um modelo depois na aba "Models" do app.
        )
    ) else (
        echo   [OK] !MODELS_COUNT! modelo(s) encontrado(s)
    )
)

:: ─────────────────────────────────────────────────────────────────────────────
:: Resultado final
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo ==========================================
if "%ERRORS%"=="0" (
    echo   [OK] Setup concluido com sucesso!
    echo ==========================================
    echo.
    echo   Para INICIAR o aplicativo agora, execute:
    echo.
    echo     npm run tauri dev
    echo.
    echo   Para COMPILAR o instalador:
    echo.
    echo     npm run tauri build
    echo.
    echo ==========================================
    echo.
    set /p START_NOW="  Deseja iniciar o ARKIUM agora? [S/N]: "
    if /i "!START_NOW!"=="S" (
        echo.
        echo   Iniciando ARKIUM AI Desktop Chat...
        echo   (A primeira compilacao Rust pode demorar ~5 minutos)
        echo.
        call npm run tauri dev
    )
) else (
    echo   [!] Setup com erros. Veja as mensagens acima.
    echo ==========================================
)
echo.
pause
