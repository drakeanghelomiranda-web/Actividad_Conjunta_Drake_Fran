// 1. Lectura dels camps del formulari HTML ------------
function llegirCampsFormulari() {
    return {
        nomViatge: document.querySelector("#nomViatge").value,
        dataSortida: document.querySelector("#dataSortida").value,
        dataTornada: document.querySelector("#dataTornada").value,
        pressupost: document.querySelector("#pressupost").value,
        transport: document.querySelector("#transport").value,
        preuNit: document.querySelector("#preuNit").value,
        despesaLaborable: document.querySelector("#despesaLaborable").value,
        despesaCapSetmana: document.querySelector("#despesaCapSetmana").value
    };
}

// Comprova que el nom introduït no està buit després d'eliminar espais als extrems
function validarNomViatge(nomRaw) {
    const nomNet = nomRaw ? nomRaw.trim() : "";
    if (nomNet === "") {
        throw new Error("El nom del viatge no pot estar buit.");
    }
    return nomNet;
}

// Funció per validar totes les dades numèriques i les dates
function validarDadesViatge(dadesRaw) {
    // 1. Valida el nom
    const nomViatge = validarNomViatge(dadesRaw.nomViatge);

    // 2. Conversió i comprovació dels imports numèrics
    function processarImport(text, nomCamp, permetreZero = true) { // permetreZero ajuda a no acceptar 0 al pressupost però sí als altres imports
        // Dona error si el camp rebut està buit
        if (typeof text !== "string" || text.trim() === "") {
            throw new Error(`El camp '${nomCamp}' no pot estar buit.`);
        }
        const textNet = text.trim();
        const num = Number(textNet);

        // Error si no és un nombre finit
        if (!Number.isFinite(num)) {
            throw new Error(`El camp '${nomCamp}' ha de ser un nombre vàlid.`);
        }

        // Controla el zero o els valors negatius
        if (permetreZero ? num < 0 : num <= 0) {
            throw new Error(`El camp '${nomCamp}' ha de ser ${permetreZero ? 'major o igual a zero' : 'estrictament positiu'}.`);
        }

        // Xepa l'string cada vegada que troba 1 punt per controlar decimals
        const parts = textNet.split(".");
        // Controla que no tengui més d'un punt, i si en té un, que no tengui més de 2 decimals
        if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
            throw new Error(`El camp '${nomCamp}' no pot tenir més de 2 decimals.`);
        }

        return num;
    }

    const pressupost = processarImport(dadesRaw.pressupost, "Pressupost", false);
    const transport = processarImport(dadesRaw.transport, "Transport");
    const preuNit = processarImport(dadesRaw.preuNit, "Preu per nit");
    const despesaLaborable = processarImport(dadesRaw.despesaLaborable, "Despesa laborable");
    const despesaCapSetmana = processarImport(dadesRaw.despesaCapSetmana, "Despesa de cap de setmana");

    // 2. Processament de dates amb UTC
    // Comprova que hi hagi dues dates seleccionades
    if (!dadesRaw.dataSortida || !dadesRaw.dataTornada) {
        throw new Error("S'han d'indicar les dues dates (sortida i tornada).");
    }

    // Instancia a UTC a les 00:00:00Z per evitar desfases del canvi d'hora de la tardor
    const dataInici = new Date(dadesRaw.dataSortida + "T00:00:00Z");
    const dataFi = new Date(dadesRaw.dataTornada + "T00:00:00Z");

    // Comprova que les dates siguin vàlides
    if (!Number.isFinite(dataInici.getTime()) || !Number.isFinite(dataFi.getTime())) {
        throw new Error("Les dates introduïdes no són vàlides.");
    }

    // Comprova que la data de tornada sigui igual o posterior a la de sortida
    if (dataFi < dataInici) {
        throw new Error("La data de tornada no pot ser anterior a la data de sortida.");
    }

    // Criteri de dies de calendari incloent ambdós extrems
    const msPerDia = 86400000; // Mil·lisegons en 24 hores
    const dies = Math.round((dataFi.getTime() - dataInici.getTime()) / msPerDia) + 1;

    // Comprova que la durada estigui entre 1 i 30 dies inclosos
    if (dies < 1 || dies > 30) {
        throw new Error(`La durada del viatge ha de ser d'entre 1 i 30 dies (inclosos). Durada actual: ${dies} dies.`);
    }

    return {
        nomViatge,
        dataInici,
        dataFi,
        dies,
        pressupost,
        transport,
        preuNit,
        despesaLaborable,
        despesaCapSetmana,
        dataSortidaRaw: dadesRaw.dataSortida,
        dataTornadaRaw: dadesRaw.dataTornada
    };
}


// 3. Calcula el pressupost, recorre els dies i dedueix el tipus de jornada des de la data
function calcularPlanificacio(dadesValidades) {
    const {
        nomViatge, dataInici, dies, pressupost, transport,
        preuNit, despesaLaborable, despesaCapSetmana,
        dataSortidaRaw, dataTornadaRaw
    } = dadesValidades;

    // Les nits són els dies menys un (si és 1 dia, són 0 nits)
    const nits = dies - 1;
    const detallDiari = [];
    let acumulat = 0;
    let costAllotjamentTotal = 0;
    let despesaDiariaTotal = 0;
    let diesLaborables = 0;
    let diesCapSetmana = 0;

    // Recorrem cada dia avançant un cursor de data en UTC
    for (let i = 0; i < dies; i++) {
        const diaNum = i + 1;

        // Cream una còpia de la data d'inici i li sumam 'i' dies
        const cursorData = new Date(dataInici.getTime());
        cursorData.setUTCDate(cursorData.getUTCDate() + i);

        // Detecció automàtica del cap de setmana (0 = Diumenge, 6 = Dissabte)
        const diaSetmana = cursorData.getUTCDay();
        const esCapSetmana = (diaSetmana === 0 || diaSetmana === 6);

        if (esCapSetmana) {
            diesCapSetmana++;
        } else {
            diesLaborables++;
        }

        // Regles de costos:
        // - Transport: import únic cobrat només el primer dia
        const importTransportDia = (diaNum === 1) ? transport : 0;
        
        // - Allotjament: preu per nit aplicat tots els dies excepte el darrer
        const importAllotjamentDia = (diaNum < dies) ? preuNit : 0;

        // - Despesa diària: segons si la data dedueix que és laborable o cap de setmana
        const importDespesaDia = esCapSetmana ? despesaCapSetmana : despesaLaborable;

        const costDia = importTransportDia + importAllotjamentDia + importDespesaDia;
        acumulat += costDia;

        costAllotjamentTotal += importAllotjamentDia;
        despesaDiariaTotal += importDespesaDia;

        // Formata la data en format DD/MM/YYYY per mostrar-la a la taula
        const dataFormatted = cursorData.toISOString().slice(0, 10).split('-').reverse().join('/');

        detallDiari.push({
            diaNum,
            dataIso: cursorData.toISOString().slice(0, 10),
            dataFormatted,
            esCapSetmana,
            tipusDiaText: esCapSetmana ? "Cap de setmana" : "Laborable",
            importTransportDia,
            importAllotjamentDia,
            importDespesaDia,
            costDia,
            acumulat
        });
    }

    const costTotal = acumulat;
    const saldo = pressupost - costTotal;
    const mitjanaDiaria = costTotal / dies;

    // Classifica l'estat de pressupost
    let estat;
    if (costTotal > pressupost) {
        estat = "Insuficient";
    } else if (costTotal >= pressupost * 0.9) {
        estat = "Ajustat";
    } else {
        estat = "Suficient";
    }

    return {
        nomViatge,
        dataSortidaRaw,
        dataTornadaRaw,
        dies,
        nits,
        diesLaborables,
        diesCapSetmana,
        pressupost,
        transport,
        preuNit,
        costAllotjamentTotal,
        despesaDiariaTotal,
        costTotal,
        saldo,
        mitjanaDiaria,
        estat,
        detallDiari
    };
}


// 4. Mostra un missatge d'error a la pàgina i amaga resultats anteriors
function mostrarError(missatgeText) {
    const container = document.querySelector("#missatge-container");
    container.textContent = missatgeText;
    container.classList.remove("hidden");

    // Amagam la secció de resultats per no presentar un resultat anterior com si fos l'actual
    document.querySelector("#seccio-resultats").classList.add("hidden");
}

// Neteja el contenidor d'errors
function netejarError() {
    const container = document.querySelector("#missatge-container");
    container.textContent = "";
    container.classList.add("hidden");
}

let temporitzadorAvis = null;
// Mostra un avís temporal que s'esborra als 3 segons sense acumular temporitzadors
function avisTemporal(text) {
    if (temporitzadorAvis !== null) {
        clearTimeout(temporitzadorAvis);
    }
    const avisElem = document.querySelector("#avis");
    avisElem.textContent = text;
    temporitzadorAvis = setTimeout(() => {
        avisElem.textContent = "";
        temporitzadorAvis = null;
    }, 3000);
}

// 5. Emplena els camps del formulari HTML amb les dades d'un objecte
function omplirCampsFormulari(dades) {
    if (!dades) return;
    document.querySelector("#nomViatge").value = dades.nomViatge || "";
    document.querySelector("#dataSortida").value = dades.dataSortidaRaw || dades.dataSortida || "";
    document.querySelector("#dataTornada").value = dades.dataTornadaRaw || dades.dataTornada || "";
    document.querySelector("#pressupost").value = dades.pressupost ?? "";
    document.querySelector("#transport").value = dades.transport ?? "";
    document.querySelector("#preuNit").value = dades.preuNit ?? "";
    document.querySelector("#despesaLaborable").value = dades.despesaLaborable ?? "";
    document.querySelector("#despesaCapSetmana").value = dades.despesaCapSetmana ?? "";
}

// 4. Mostra el resum i la taula de detall a la pàgina usant el DOM (Sense innerHTML)
function renderitzarResultats(planificacio) {
    netejarError();

    document.querySelector("#resum-nom").textContent = planificacio.nomViatge;
    
    // Assigna el nom de l'estat i la classe visual CSS (suficient, ajustat, insuficient)
    const badgeEstat = document.querySelector("#badge-estat");
    badgeEstat.textContent = planificacio.estat;
    badgeEstat.className = "badge " + planificacio.estat.toLowerCase();

    // Mètriques del resum
    document.querySelector("#resum-durada").textContent = `${planificacio.dies} dies / ${planificacio.nits} nits`;
    document.querySelector("#resum-tipus-dies").textContent = `${planificacio.diesLaborables} laborables, ${planificacio.diesCapSetmana} cap de setmana`;
    document.querySelector("#resum-cost-total").textContent = `${planificacio.costTotal.toFixed(2)} €`;
    document.querySelector("#resum-transport").textContent = `${planificacio.transport.toFixed(2)} €`;
    document.querySelector("#resum-saldo").textContent = `${planificacio.saldo.toFixed(2)} €`;
    document.querySelector("#resum-pressupost").textContent = `${planificacio.pressupost.toFixed(2)} €`;
    document.querySelector("#resum-mitjana").textContent = `${planificacio.mitjanaDiaria.toFixed(2)} €/dia`;
    document.querySelector("#resum-allotjament").textContent = `${planificacio.costAllotjamentTotal.toFixed(2)} €`;

    // Buidam la taula abans de recórrer per evitar duplicar files en prémer Calcular
    const tbody = document.querySelector("#taula-detall-body");
    tbody.textContent = "";

    // Recorrem les files i les cream amb createElement i textContent (sense usar innerHTML per seguretat)
    for (const fila of planificacio.detallDiari) {
        const tr = document.createElement("tr");

        const tdDia = document.createElement("td");
        tdDia.textContent = fila.diaNum;
        tr.appendChild(tdDia);

        const tdData = document.createElement("td");
        tdData.textContent = fila.dataFormatted;
        tr.appendChild(tdData);

        const tdTipus = document.createElement("td");
        const badgeTipus = document.createElement("span");
        badgeTipus.textContent = fila.tipusDiaText;
        badgeTipus.className = fila.esCapSetmana ? "tag-weekend" : "tag-workday";
        tdTipus.appendChild(badgeTipus);
        tr.appendChild(tdTipus);

        const tdTransport = document.createElement("td");
        tdTransport.textContent = `${fila.importTransportDia.toFixed(2)} €`;
        tr.appendChild(tdTransport);

        const tdAllotjament = document.createElement("td");
        tdAllotjament.textContent = `${fila.importAllotjamentDia.toFixed(2)} €`;
        tr.appendChild(tdAllotjament);

        const tdDespesa = document.createElement("td");
        tdDespesa.textContent = `${fila.importDespesaDia.toFixed(2)} €`;
        tr.appendChild(tdDespesa);

        const tdCostDia = document.createElement("td");
        tdCostDia.textContent = `${fila.costDia.toFixed(2)} €`;
        tr.appendChild(tdCostDia);

        const tdAcumulat = document.createElement("td");
        tdAcumulat.textContent = `${fila.acumulat.toFixed(2)} €`;
        tr.appendChild(tdAcumulat);

        tbody.appendChild(tr);
    }

    // Mostram la secció de resultats una vegada generada
    document.querySelector("#seccio-resultats").classList.remove("hidden");
}

// 5. Funció principal per executar l'acció de Calcular
function realitzarCalcul() {
    try {
        const raw = llegirCampsFormulari();
        const validades = validarDadesViatge(raw);
        const planificacio = calcularPlanificacio(validades);
        renderitzarResultats(planificacio);
        avisTemporal("Càlcul actualitzat correctament.");
        return planificacio;
    } catch (err) {
        mostrarError(err.message);
        return null;
    }
}


const CLAU_STORAGE = "dwc.ut3.planificacio";
const CLAU_RESUM = "dwc.ut3.resum";

// 5. Guarda la planificació vàlida a localStorage amb JSON
function guardarPlanificacio() {
    // Forçam recalcular per validar abans de guardar
    const planificacio = realitzarCalcul();
    if (!planificacio) {
        return; // No es desa si les dades són invàlides
    }

    try {
        localStorage.setItem(CLAU_STORAGE, JSON.stringify(llegirCampsFormulari()));
        avisTemporal("Planificació guardada correctament a localStorage.");
    } catch (err) {
        mostrarError("No s'ha pogut accedir a l'emmagatzematge local: " + err.message);
    }
}

// 5-6. Recupera dades desades, omple camps, valida i recalcula
function recuperarPlanificacio() {
    try {
        const jsonText = localStorage.getItem(CLAU_STORAGE);
        if (jsonText === null) {
            mostrarError("No hi ha cap planificació guardada a l'emmagatzematge.");
            return;
        }

        const dades = JSON.parse(jsonText);

        // Omplim els camps i recalculem sense confiar només en totals guardats
        omplirCampsFormulari(dades);
        const planificacio = realitzarCalcul();

        if (planificacio) {
            avisTemporal("Planificació recuperada i recalculada amb èxit.");
        }
    } catch (err) {
        mostrarError("El contingut desat és invàlid o ha estat corromput: " + err.message);
    }
}

// 6. Esborra només la clau de l'aplicació després de confirmar
function esborrarPlanificacio() {
    const desat = localStorage.getItem(CLAU_STORAGE);
    if (desat === null) {
        mostrarError("No hi ha cap dada guardada per esborrar.");
        return;
    }

    const confirmat = confirm("Estàs segur que vols esborrar la darrera planificació guardada?");
    if (confirmat) {
        localStorage.removeItem(CLAU_STORAGE);
        avisTemporal("Planificació guardada esborrada.");
    }
}


// 7. Guarda instantània actual i obre el resum en una segona finestra/pestanya
function obrirResum() {
    // Recalcula primer les entrades actuals
    const planificacio = realitzarCalcul();
    if (!planificacio) {
        return;
    }

    try {
        // Desa la instantània del darrer càlcul vàlid
        localStorage.setItem(CLAU_RESUM, JSON.stringify(planificacio));
        
        const url = "resum.html?v=" + Date.now();
        const finestra = window.open(url, "resumDwc");

        // Comprova si l'obertura ha estat bloquejada pel navegador
        if (finestra === null) {
            mostrarError("L'obertura de la finestra de resum ha estat bloquejada pel navegador. Permet les finestres emergents.");
        } else {
            avisTemporal("Finestra de resum oberta.");
        }
    } catch (err) {
        mostrarError("Error en preparar el resum: " + err.message);
    }
}

// Assigna els escoltadors d'esdeveniments quan el DOM està a punt
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#btn-calcular").addEventListener("click", realitzarCalcul);
    document.querySelector("#btn-guardar").addEventListener("click", guardarPlanificacio);
    document.querySelector("#btn-recuperar").addEventListener("click", recuperarPlanificacio);
    document.querySelector("#btn-esborrar").addEventListener("click", esborrarPlanificacio);
    document.querySelector("#btn-resum").addEventListener("click", obrirResum);

    // Càlcul inicial amb les dades per defecte del formulari
    realitzarCalcul();
});