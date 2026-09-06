(() => {
    "use strict";

    const DATABASE_STORAGE_KEY = "kasirku.setup.database";

    const savedDatabase = localStorage.getItem(DATABASE_STORAGE_KEY);
    const supportedDatabases = ["mysql", "postgresql", "sqlite"];

    const state = {
        currentStep: 1,
        totalSteps: 5,
        database: supportedDatabases.includes(savedDatabase) ? savedDatabase : "mysql",
        processingTimer: null,
        finished: false,
        connectionTested: false,
    };
    const elements = {
        progressBar: document.getElementById("progressBar"),
        progressWrapper: document.querySelector(".progress-wrapper"),
        currentStepLabel: document.getElementById("currentStepLabel"),
        backButton: document.getElementById("backButton"),
        nextButton: document.getElementById("nextButton"),
        wizardFooter: document.getElementById("wizardFooter"),
        serverPort: document.getElementById("serverPort"),
        tlsSection: document.getElementById("tlsSection"),
        tlsUploadFields: document.getElementById("tlsUploadFields"),
        tlsCertificate: document.getElementById("tlsCertificate"),
        tlsKey: document.getElementById("tlsKey"),
        connectionForm: document.getElementById("connectionForm"),
        connectionStatus: document.getElementById("connectionStatus"),
        connectionStatusTitle: document.getElementById("connectionStatusTitle"),
        connectionStatusMessage: document.getElementById("connectionStatusMessage"),
        adminForm: document.getElementById("adminForm"),
        adminFullName: document.getElementById("adminFullName"),
        adminUsername: document.getElementById("adminUsername"),
        adminPassword: document.getElementById("adminPassword"),
        adminConfirmPassword: document.getElementById("adminConfirmPassword"),
        adminValidationMessage: document.getElementById("adminValidationMessage"),
        processingScreen: document.getElementById("processingScreen"),
        processingProgressBar: document.getElementById("processingProgressBar"),
        successScreen: document.getElementById("successScreen"),
        openAppButton: document.getElementById("openAppButton"),
        stepItems: [...document.querySelectorAll(".stepper-item")],
        wizardSteps: [...document.querySelectorAll(".wizard-step")],
        protocolInputs: [...document.querySelectorAll('input[name="protocol"]')],
        tlsInputs: [...document.querySelectorAll('input[name="tlsMode"]')],
        compileInputs: [...document.querySelectorAll('input[name="compileHtml"]')],
        databaseInputs: [...document.querySelectorAll('input[name="database"]')],
        componentInputs: [...document.querySelectorAll('input[name="components"]')],
    };

    async function fileToBase64(file) {
        const buffer = await file.arrayBuffer();

        let binary = "";
        const bytes = new Uint8Array(buffer);

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }

        return btoa(binary);
    }

    function showStep(stepNumber) {
        if (state.finished) return;
        if (stepNumber < 1 || stepNumber > state.totalSteps) return;

        state.currentStep = stepNumber;

        elements.wizardSteps.forEach((step) => {
            const isActive = Number(step.dataset.step) === stepNumber;
            step.classList.toggle("active", isActive);
        });

        elements.stepItems.forEach((item) => {
            const itemStep = Number(item.dataset.stepTarget);
            item.classList.toggle("active", itemStep === stepNumber);
            item.classList.toggle("completed", itemStep < stepNumber);
        });

        const progress = (stepNumber / state.totalSteps) * 100;
        elements.progressBar.style.width = `${progress}%`;
        elements.currentStepLabel.textContent = stepNumber;

        elements.backButton.disabled = stepNumber === 1;
        elements.nextButton.disabled = false;
        elements.nextButton.innerHTML = stepNumber === state.totalSteps
            ? 'Finish <i class="bi bi-check2"></i>'
            : 'Next <i class="bi bi-arrow-right"></i>';

        clearConnectionStatus();
        updateNextButtonState();
    }

    function goNext() {
        if (!validateStep(state.currentStep)) return;
        if (state.currentStep === state.totalSteps) {
            startProcessing();
            return;
        }
        showStep(state.currentStep + 1);
    }

    function goBack() {
        if (state.currentStep > 1) showStep(state.currentStep - 1);
    }
    function validateStep(stepNumber) {
        if (stepNumber === 2) {
            const port = Number(elements.serverPort.value);
            const protocol = getCheckedValue("protocol");

            if (!Number.isInteger(port) || port < 1 || port > 65535) {
                elements.serverPort.focus();
                elements.serverPort.classList.add("is-invalid");
                return false;
            }

            elements.serverPort.classList.remove("is-invalid");

            if (protocol === "https") {
                const tlsMode = getCheckedValue("tlsMode");
                if (tlsMode === "upload") {
                    const certificate = document.getElementById("tlsCertificate");
                    const key = document.getElementById("tlsKey");

                    const certificateValid = Boolean(certificate?.files?.length);
                    const keyValid = Boolean(key?.files?.length);

                    updateTlsFileValidation(certificate, certificateValid);
                    updateTlsFileValidation(key, keyValid);

                    if (!certificateValid || !keyValid) return false;
                }
            }
        }

        if (stepNumber === 4) {
            if (!validateConnectionInputs()) return false;

            if ((state.database === "mysql" || state.database === "postgresql") && !state.connectionTested) {
                showConnectionStatus(
                    "error",
                    "Test Connection required",
                    "Berhasil melewati konfigurasi belum cukup. Jalankan Test Connection sampai berhasil terlebih dahulu."
                );
                return false;
            }

            return true;
        }

        if (stepNumber === 5) return validateAdminInputs();
        return true;
    }

    function validateConnectionInputs() {
        const database = state.database;
        const form = elements.connectionForm;
        const inputs = [...form.querySelectorAll("[data-required]")];

        let valid = true;

        inputs.forEach((input) => {
            const value = input.value.trim();
            const isValid = Boolean(value);
            input.classList.toggle("is-invalid", !isValid);
            if (!isValid) valid = false;
        });

        if (!valid && database !== "sqlite") return false;
        if (database === "sqlite") {
            const pathInput = form.querySelector("[name=sqlitePath]");
            if (pathInput && !pathInput.value.trim()) {
                pathInput.classList.add("is-invalid");
                pathInput.focus();
                return false;
            }
        }

        return valid;
    }

    function updateTlsFileValidation(input, isValid) {
        if (!input) return;

        const card = input.closest(".file-upload-card");
        card?.classList.toggle("is-invalid", !isValid);
        input.classList.toggle("is-invalid", !isValid);
    }

    function handleProtocolChange() {
        const protocol = getCheckedValue("protocol");
        const defaultPort = protocol === "https" ? "443" : "80";

        if (elements.serverPort.value === "80" || elements.serverPort.value === "443" || !elements.serverPort.value) elements.serverPort.value = defaultPort;
        updateTlsFields();
    }

    function updateTlsFields() {
        const protocol = getCheckedValue("protocol");
        const isHttps = protocol === "https";
        const tlsMode = getCheckedValue("tlsMode");
        const shouldShowUpload = isHttps && tlsMode === "upload";

        elements.tlsSection.classList.toggle("is-disabled", !isHttps);
        elements.tlsUploadFields.classList.toggle("d-none", !shouldShowUpload);

        document.querySelectorAll('input[name="tlsMode"]').forEach((input) => {
            input.disabled = !isHttps;
        });

        [elements.tlsCertificate, elements.tlsKey].forEach((input) => {
            if (!input) return;
            input.disabled = !shouldShowUpload;
        });
    }

    function renderConnectionForm(database) {
        const databaseConfig = {
            mysql: {
                badge: "MySQL",
                defaultPort: 3306,
                fields: `
                    ${inputField({
                        label: "Host",
                        name: "host",
                        value: "localhost",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Port",
                        name: "port",
                        value: 3306,
                        type: "number",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Username",
                        name: "user",
                        value: "root",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Password",
                        name: "pass",
                        value: "",
                        type: "password",
                        required: false,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Database Name",
                        name: "name",
                        value: "kasirku",
                        required: true,
                        col: "col-md-12",
                    })}
                `,
            },
            postgresql: {
                badge: "PostgreSQL",
                defaultPort: 5432,
                fields: `
                    ${inputField({
                        label: "Host",
                        name: "host",
                        value: "localhost",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Port",
                        name: "port",
                        value: 5432,
                        type: "number",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Username",
                        name: "user",
                        value: "postgres",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Password",
                        name: "pass",
                        value: "",
                        type: "password",
                        required: false,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Database Name",
                        name: "name",
                        value: "kasirku",
                        required: true,
                        col: "col-md-12",
                    })}
                `,
            },
            sqlite: {
                badge: "SQLite",
                defaultPort: null,
                fields: `
                    ${inputField({
                        label: "Database Name",
                        name: "name",
                        value: "kasirku",
                        required: true,
                        col: "col-md-12",
                        placeholder: "kasirku",
                    })}
                `,
            },
        };

        const config = databaseConfig[database];
        if (!config) return;

        const canTest = database === "mysql" || database === "postgresql";
        state.connectionTested = false;

        elements.connectionForm.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                    <div class="text-muted" style="font-size: 11px;">Selected database</div>
                    <strong>${config.badge}</strong>
                </div>
            </div>

            <div class="row g-3">
                ${config.fields}
            </div>

            <div class="connection-actions">
                ${canTest ? `
                    <button id="testConnectionButton" type="button" class="btn btn-outline-primary btn-test-connection">
                        <i class="bi bi-plug me-1"></i>
                        Test Connection
                    </button>
                ` : ""}
            </div>
        `;

        const testButton = document.getElementById("testConnectionButton");
        if (testButton) {
            testButton.addEventListener("click", testConnection);
        }
    }

    function inputField({label, name, value = "", type = "text", required = false, col = "col-md-12", placeholder = ""}) {
        return `
            <div class="${col}">
                <label class="form-label" for="connection-${name}">${label}</label>
                <input
                    id="connection-${name}"
                    class="form-control"
                    name="${name}"
                    type="${type}"
                    value="${escapeHtmlAttribute(String(value))}"
                    ${required ? "data-required" : ""}
                    placeholder="${escapeHtmlAttribute(placeholder)}"
                >
            </div>
        `;
    }

    async function testConnection() {
        if (!validateConnectionInputs()) {
            state.connectionTested = false;
            showConnectionStatus(
                "error",
                "Invalid configuration",
                "Lengkapi semua field connection terlebih dahulu."
            );
            updateNextButtonState();
            return;
        }

        const button = document.getElementById("testConnectionButton");
        if (!button) return;

        const originalButtonHtml = button.innerHTML;

        state.connectionTested = false;
        updateNextButtonState();

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Testing...';

        try {
            const response = await fetch('/test_connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectConnectionData()),
            });

            const res_text = await response.text();
            state.connectionTested = response.status === 200;

            showConnectionStatus(
                state.connectionTested ? "success" : "error",
                state.connectionTested ? "Connection successful" : "Connection failed",
                res_text || (state.connectionTested ? "Database connection berhasil." : "Database connection gagal.")
            );
        } catch (error) {
            state.connectionTested = false;
            showConnectionStatus(
                "error",
                "Connection failed",
                error instanceof Error ? error.message : "Tidak dapat menghubungi server."
            );
        } finally {
            button.disabled = false;
            button.innerHTML = originalButtonHtml;
            updateNextButtonState();
        }
    }

    function showConnectionStatus(type, title, message) {
        elements.connectionStatus.classList.remove("d-none", "is-success", "is-error");
        if (type === "success") elements.connectionStatus.classList.add("is-success");
        if (type === "error") elements.connectionStatus.classList.add("is-error");

        elements.connectionStatusTitle.textContent = title;
        elements.connectionStatusMessage.textContent = message;
    }

    function clearConnectionStatus() {
        elements.connectionStatus.classList.add("d-none");
        elements.connectionStatus.classList.remove("is-success", "is-error");
    }

    function updateNextButtonState() {
        if (state.currentStep !== 4) {
            elements.nextButton.disabled = false;
            return;
        }

        const requiresTest = state.database === "mysql" || state.database === "postgresql";
        elements.nextButton.disabled = requiresTest && !state.connectionTested;
    }

    function validateAdminInputs() {
        const fields = [
            elements.adminFullName,
            elements.adminUsername,
            elements.adminPassword,
            elements.adminConfirmPassword,
        ];

        let valid = true;

        fields.forEach((input) => {
            if (!input) return;
            const fieldValid = Boolean(input.value.trim());
            input.classList.toggle("is-invalid", !fieldValid);
            if (!fieldValid) valid = false;
        });

        if (elements.adminPassword?.value && elements.adminConfirmPassword?.value) {
            const passwordsMatch = elements.adminPassword.value === elements.adminConfirmPassword.value;
            elements.adminPassword.classList.toggle("is-invalid", !passwordsMatch);
            elements.adminConfirmPassword.classList.toggle("is-invalid", !passwordsMatch);

            if (!passwordsMatch) {
                valid = false;
                elements.adminValidationMessage.textContent = "Password dan Confirm Password harus sama.";
                elements.adminValidationMessage.classList.remove("d-none");
            } else {
                elements.adminValidationMessage.classList.add("d-none");
            }
        } else {
            elements.adminValidationMessage.classList.add("d-none");
        }

        const firstInvalid = fields.find((input) => input?.classList.contains("is-invalid"));
        firstInvalid?.focus();

        return valid;
    }

    async function checkOldDB() {
        const response = await fetch('/check_old_db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectConnectionData()),
        });

        if (response.status === 403) {
            await Swal.fire({
                icon: "error",
                title: "Database Error",
                text: await response.text(),
                confirmButtonText: "OK",
            });
            return -1;
        }

        return response.status === 200;
    }

    function backToComponents() {
        clearInterval(state.processingTimer);

        state.finished = false;
        state.currentStep = 5;
        state.connectionTested = false;

        elements.processingScreen.classList.add("d-none");
        elements.successScreen.classList.add("d-none");

        elements.progressWrapper?.classList.remove("d-none");
        elements.wizardFooter.classList.remove("d-none");

        elements.stepItems.forEach((item) => {
            item.disabled = false;
            item.removeAttribute("aria-disabled");
            item.classList.remove("active", "completed");
        });

        elements.wizardSteps.forEach((step) => {
            step.classList.remove("active");
        });

        showStep(5);
    }

    function setProgress(start, target, duration = 1000) {
        return new Promise(resolve => {
            target = Math.max(0, Math.min(target, 100));

            const startTime = performance.now();

            cancelAnimationFrame(state.processingTimer);

            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const t = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const current = start + (target - start) * eased;

                elements.processingProgressBar.style.width = `${current}%`;

                if (t < 1) {
                    state.processingTimer = requestAnimationFrame(animate);
                } else {
                    elements.processingProgressBar.style.width = `${target}%`;
                    state.processingTimer = null;
                    resolve();
                }
            }

            state.processingTimer = requestAnimationFrame(animate);
        });
    }

    async function startProcessing() {
        state.finished = true;
        elements.componentInputs.forEach((input) => {
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        elements.stepItems.forEach((item) => {
            item.classList.remove("active");
            item.classList.add("completed");
            item.disabled = true;
            item.setAttribute("aria-disabled", "true");
        });

        const configuration = collectConfiguration();
        console.log("KasirKu setup configuration:", configuration);

        elements.progressWrapper?.classList.add("d-none");
        elements.wizardFooter.classList.add("d-none");
        elements.wizardSteps.forEach((step) => step.classList.remove("active"));
        elements.stepItems.forEach((item) => item.classList.remove("active"));
        elements.processingScreen.classList.remove("d-none");

        elements.processingProgressBar.style.width = "0%";

        let db_new_migrate = await checkOldDB();
        if (db_new_migrate === -1) return backToComponents();
        else if (db_new_migrate === true) {
            const res_swal = await Swal.fire({
                icon: "question",
                title: "Database Lama Ditemukan",
                html: `
                    <p class="mb-2">
                        KasirKu menemukan database dari versi sebelumnya.
                        Apakah Anda ingin memigrasikan data tersebut?
                    </p>
                    <div class="alert alert-warning text-start mb-0" style="font-size: 14px;">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        <strong>Perhatian:</strong>
                        Jika memilih <strong>Tidak</strong>, data dari database lama
                        tidak akan dimigrasikan dan tidak dapat dipulihkan melalui KasirKu.
                    </div>
                `,
                showCancelButton: true,
                cancelButtonText: "Tidak",
                confirmButtonText: "Ya",
                reverseButtons: true
            });

            db_new_migrate = res_swal.isConfirmed
        }

        setProgress(0, 25, 7000);

        const res_db = await fetch('/setup_db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectConnectionData()),
        });

        if (res_db.status === 403) {
            await Swal.fire({
                icon: "error",
                title: "Database Error",
                text: await res_db.text(),
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }
        else if (res_db.status === 400) {
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong! Please try again later",
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }
        setProgress(25, 50, 7000);

        const res_store = await fetch('/setup_store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                
            }),
        });

        if (res_store.status === 403) {
            await Swal.fire({
                icon: "error",
                title: "Database Error",
                text: await res_store.text(),
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }
        else if (res_store.status === 400) {
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong! Please try again later",
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }

        setProgress(50, 75, 10000);
        const res_server = await fetch('/setup_server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                protocol: getCheckedValue("protocol"),
                port: Number(elements.serverPort.value),
                tls: {
                    mode: getCheckedValue("tlsMode"),
                    certificate: fileToBase64(document.getElementById("tlsCertificate")?.files?.[0]) ?? null,
                    key: fileToBase64(document.getElementById("tlsKey")?.files?.[0]) ?? null,
                },
                compile_html: getCheckedValue("compileHtml") === "yes",
            }),
        });

        if (res_server.status === 403) {
            await Swal.fire({
                icon: "error",
                title: "Server Error",
                text: await res_server.text(),
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }
        else if (res_server.status === 400) {
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong! Please try again later",
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }

        setProgress(75, 95, 10000);
        const res_final = await fetch('/setup_final', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin: collectAdminData(),
            }),
        });

        if (res_final.status === 400) {
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong! Please try again later",
                confirmButtonText: "OK",
            });

            cancelAnimationFrame(state.processingTimer);
            return backToComponents();
        }
        
        await setProgress(95, 100, 1000);
        showSuccess();
    }

    function showSuccess() {
        elements.processingScreen.classList.add("d-none");
        elements.successScreen.classList.remove("d-none");
    }

    function collectAdminData() {
        return {
            full_name: elements.adminFullName?.value.trim() ?? "",
            username: elements.adminUsername?.value.trim() ?? "",
            password: elements.adminPassword?.value ?? "",
            confirm_password: elements.adminConfirmPassword?.value ?? "",
        };
    }

    function collectConfiguration() {
        return {
            server: {
                protocol: getCheckedValue("protocol"),
                port: Number(elements.serverPort.value),
                tls: {
                    mode: getCheckedValue("tlsMode"),
                    certificate: document.getElementById("tlsCertificate")?.files?.[0]?.name ?? null,
                    key: document.getElementById("tlsKey")?.files?.[0]?.name ?? null,
                },
                compile_html: getCheckedValue("compileHtml") === "yes",
            },
            database: collectConnectionData(),
            admin: collectAdminData(),
        };
    }

    function collectConnectionData() {
        const formData = new FormData(elements.connectionForm);

        return {
            type: state.database,
            ...Object.fromEntries(formData.entries()),
        };
    }

    function handleDatabaseChange(event) {
        state.database = event.target.value;
        localStorage.setItem(DATABASE_STORAGE_KEY, state.database);

        elements.databaseInputs.forEach((input) => {
            input.closest(".database-card")?.classList.toggle("selected", input.checked);
        });

        renderConnectionForm(state.database);
        updateNextButtonState();
    }
    function getCheckedValue(name) {
        return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
    }

    function escapeHtmlAttribute(value) {
        return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }
    elements.nextButton.addEventListener("click", goNext);
    elements.backButton.addEventListener("click", goBack);


    elements.protocolInputs.forEach((input) => {
        input.addEventListener("change", handleProtocolChange);
    });

    elements.tlsInputs.forEach((input) => {
        input.addEventListener("change", updateTlsFields);
    });

    elements.databaseInputs.forEach((input) => {
        input.addEventListener("change", handleDatabaseChange);
    });

    elements.serverPort.addEventListener("input", () => {
        elements.serverPort.classList.remove("is-invalid");
    });

    [elements.tlsCertificate, elements.tlsKey].forEach((input) => {
        input?.addEventListener("change", () => {
            const nameElement = input.closest(".file-upload-card")?.querySelector(".file-upload-name");
            if (!nameElement) return;

            nameElement.textContent = input.files?.[0]?.name || "Choose file";
            const hasFile = Boolean(input.files?.length);
            input.closest(".file-upload-card")?.classList.toggle("has-file", hasFile);
            updateTlsFileValidation(input, hasFile);
        });
    });

    elements.connectionForm.addEventListener("input", () => {
        if (state.database === "mysql" || state.database === "postgresql") {
            state.connectionTested = false;
            clearConnectionStatus();
            updateNextButtonState();
        }
    });

    elements.adminForm?.addEventListener("input", (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement) {
            target.classList.remove("is-invalid");
        }
        elements.adminValidationMessage?.classList.add("d-none");
    });

    elements.openAppButton.addEventListener("click", () => {
        window.location.href = "/";
    });

    document.querySelectorAll(".alert-example-button").forEach((button) => {
        button.addEventListener("click", handleAlertExample);
    });
    async function handleAlertExample(event) {
        const type = event.currentTarget.dataset.alertType;
        let result;

        if (type === "info") {
            await Swal.fire({
                icon: "info",
                title: "Information",
                text: "Ini contoh alert informasi.",
                confirmButtonText: "OK",
            });
            return;
        }

        if (type === "confirm") {
            result = await Swal.fire({
                icon: "question",
                title: "Continue?",
                text: "Pilih Yes atau No untuk melanjutkan.",
                showCancelButton: true,
                cancelButtonText: "No",
                confirmButtonText: "Yes",
                reverseButtons: true,
            });

            await Swal.fire({
                icon: result.isConfirmed ? "success" : "info",
                title: result.isConfirmed ? "Yes selected" : "No selected",
                text: result.isConfirmed ? "Action would continue here." : "Action was cancelled.",
                confirmButtonText: "OK",
            });
            return;
        }

        if (type === "cancel") {
            result = await Swal.fire({
                icon: "warning",
                title: "Choose an action",
                text: "Contoh dialog dengan Yes, No, dan Cancel.",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "Yes",
                denyButtonText: "No",
                cancelButtonText: "Cancel",
                reverseButtons: true,
            });

            const title = result.isConfirmed ? "Yes selected" : result.isDenied ? "No selected" : "Cancelled";
            await Swal.fire({
                icon: result.isConfirmed ? "success" : result.isDenied ? "info" : "question",
                title,
                text: "Ini hanya contoh action handler.",
                confirmButtonText: "OK",
            });
            return;
        }

        if (type === "delete") {
            result = await Swal.fire({
                icon: "warning",
                title: "Delete this item?",
                text: "Data yang dihapus tidak bisa dikembalikan.",
                showCancelButton: true,
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#dc3545",
                reverseButtons: true,
            });

            if (result.isConfirmed) {
                await Swal.fire({
                    icon: "success",
                    title: "Deleted",
                    text: "Contoh delete action berhasil diproses.",
                    confirmButtonText: "OK",
                });
            }
        }
    }
    
    elements.databaseInputs.forEach((input) => {
        input.checked = input.value === state.database;
        input.closest(".database-card")?.classList.toggle("selected", input.checked);
    });

    renderConnectionForm(state.database);
    updateTlsFields();
    updateNextButtonState();
    showStep(1);
})();
