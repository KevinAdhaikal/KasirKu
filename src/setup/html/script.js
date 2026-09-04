(() => {
    "use strict";

    const state = {
        currentStep: 1,
        totalSteps: 5,
        database: "mysql",
        processingTimer: null,
        finished: false,
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

    /* =========================================================
       Validation
       Add new per-step validation here as the wizard grows.
       ========================================================= */
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

        if (stepNumber === 4) return validateConnectionInputs();
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
                        name: "username",
                        value: "root",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Password",
                        name: "password",
                        value: "",
                        type: "password",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Database Name",
                        name: "databaseName",
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
                        name: "username",
                        value: "postgres",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Password",
                        name: "password",
                        value: "",
                        type: "password",
                        required: true,
                        col: "col-md-6",
                    })}
                    ${inputField({
                        label: "Database Name",
                        name: "databaseName",
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
                        label: "Database File",
                        name: "sqlitePath",
                        value: "./database/kasirku.db",
                        required: true,
                        col: "col-md-12",
                        placeholder: "./database/kasirku.db",
                    })}
                `,
            },
        };

        const config = databaseConfig[database];
        if (!config) return;

        const canTest = database === "mysql" || database === "postgresql";

        elements.connectionForm.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                    <div class="text-muted" style="font-size: 11px;">Selected database</div>
                    <strong>${config.badge}</strong>
                </div>
                <span class="component-badge">${canTest ? "Test available" : "Local file"}</span>
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
                ` : `
                    <div class="small text-muted align-self-center">
                        SQLite tidak membutuhkan remote connection test.
                    </div>
                `}
            </div>
        `;

        const testButton = document.getElementById("testConnectionButton");
        if (testButton) {
            testButton.addEventListener("click", testConnection);
        }
    }

    function inputField({
        label,
        name,
        value = "",
        type = "text",
        required = false,
        col = "col-md-12",
        placeholder = "",
    }) {
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
            showConnectionStatus(
                "error",
                "Invalid configuration",
                "Lengkapi semua field connection terlebih dahulu."
            );
            return;
        }

        const button = document.getElementById("testConnectionButton");
        const originalButtonHtml = button.innerHTML;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Testing...';

        showConnectionStatus(
            "info",
            "Testing connection...",
            `Mencoba terhubung ke ${state.database}.`
        );

        const response = await fetch('/api/setup/database/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectConnectionData()),
        });
        const result = await response.json();

        button.disabled = false;
        button.innerHTML = originalButtonHtml;

        showConnectionStatus(
            "success",
            "Connection successful",
            "Placeholder test selesai. Ganti bagian testConnection() dengan request ke backend kamu."
        );
    }

    function showConnectionStatus(type, title, message) {
        elements.connectionStatus.classList.remove("d-none", "is-success", "is-error");

        if (type === "success") {
            elements.connectionStatus.classList.add("is-success");
        }

        if (type === "error") {
            elements.connectionStatus.classList.add("is-error");
        }

        elements.connectionStatusTitle.textContent = title;
        elements.connectionStatusMessage.textContent = message;
    }

    function clearConnectionStatus() {
        elements.connectionStatus.classList.add("d-none");
        elements.connectionStatus.classList.remove("is-success", "is-error");
    }

    /* =========================================================
       Finish / Processing
       The delay is only a UI placeholder for your backend setup call.
       ========================================================= */
    function startProcessing() {
        // Once Finish is pressed, the wizard is locked and every step is completed.
        state.finished = true;

        // Mark every component as selected so the final state is fully checked.
        elements.componentInputs.forEach((input) => {
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });

        // Mark every sidebar step as completed, including Step 5 / Components.
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

        let progress = 0;
        elements.processingProgressBar.style.width = "0%";

        clearInterval(state.processingTimer);
        state.processingTimer = setInterval(() => {
            progress += Math.floor(Math.random() * 17) + 8;
            progress = Math.min(progress, 100);
            elements.processingProgressBar.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(state.processingTimer);
                setTimeout(showSuccess, 450);
            }
        }, 350);
    }

    function showSuccess() {
        elements.processingScreen.classList.add("d-none");
        elements.successScreen.classList.remove("d-none");
    }

    /* =========================================================
       Data collection
       Gives you one object ready to send to the backend.
       ========================================================= */
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
                compileHtml: getCheckedValue("compileHtml") === "yes",
            },
            database: {
                type: state.database,
                connection: collectConnectionData(),
            },
            components: elements.componentInputs
                .filter((input) => input.checked)
                .map((input) => input.value),
        };
    }

    function collectConnectionData() {
        const formData = new FormData(elements.connectionForm);
        return Object.fromEntries(formData.entries());
    }

    /* =========================================================
       Database event handling
       ========================================================= */
    function handleDatabaseChange(event) {
        state.database = event.target.value;

        elements.databaseInputs.forEach((input) => {
            input.closest(".database-card")?.classList.toggle("selected", input.checked);
        });

        renderConnectionForm(state.database);
    }

    /* =========================================================
       Stepper clicks
       ========================================================= */
    function handleStepperClick(event) {
        if (state.finished) {
            event.preventDefault();
            return;
        }

        const targetStep = Number(event.currentTarget.dataset.stepTarget);

        // Allow jumping back to already-visited steps.
        if (targetStep < state.currentStep) {
            showStep(targetStep);
            return;
        }

        // Allow moving forward only through validation.
        if (targetStep === state.currentStep + 1 && validateStep(state.currentStep)) {
            showStep(targetStep);
        }
    }

    /* =========================================================
       Helpers
       ========================================================= */
    function getCheckedValue(name) {
        return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function escapeHtmlAttribute(value) {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    /* =========================================================
       Event bindings
       ========================================================= */
    elements.nextButton.addEventListener("click", goNext);
    elements.backButton.addEventListener("click", goBack);

    elements.stepItems.forEach((item) => {
        item.addEventListener("click", handleStepperClick);
    });

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

    elements.openAppButton.addEventListener("click", () => {
        // Change this to your actual application route.
        window.location.href = "/";
    });

    document.querySelectorAll(".alert-example-button").forEach((button) => {
        button.addEventListener("click", handleAlertExample);
    });

    /* =========================================================
       Alert examples
       These demos use SweetAlert2 and can be copied for components.
       ========================================================= */
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

    /* =========================================================
       Initial render
       ========================================================= */
    renderConnectionForm(state.database);
    updateTlsFields();
    showStep(1);
})();
