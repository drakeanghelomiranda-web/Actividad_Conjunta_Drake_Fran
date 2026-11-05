const diesText = "4";
const pressupostText = "500";
const transportText = "120";
const preuNitText = "65";
const despesaLaborableText = "30";
const despesaCapSetmanaText = "45";

function validarIConvertirImport(text, esPressupost = false) {
    if (text === null || text.trim() === "") {
        return { valid: false, error: "El camp no pot estar buit." };
    }
    
    const num = Number(text);
    
    if (isNaN(num) || !isFinite(num)) {
        return { valid: false, error: "El valor ha de ser un número vàlid." };
    }
    if (esPressupost && num <= 0) {
        return { valid: false, error: "El pressupost ha de ser un import positiu superior a 0." };
    }
    if (!esPressupost && num < 0) {
        return { valid: false, error: "L'import no pot ser un valor negatiu." };
    }
    const parts = text.trim().split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
        return { valid: false, error: "L'import no pot tenir més de 2 decimals." };
    }
    
    return { valid: true, valorCents: Math.round(num * 100) };
}

let hiHaError = false;
const diesNum = Number(diesText);
if (!Number.isInteger(diesNum) || diesNum < 1 || diesNum > 30) {
    console.error("Error en Dies: Han de ser un nombre enter entre 1 i 30.");
    hiHaError = true;
}

const resPressupost = validarIConvertirImport(pressupostText, true);
const resTransport = validarIConvertirImport(transportText);
const resPreuNit = validarIConvertirImport(preuNitText);
const resDespesaLab = validarIConvertirImport(despesaLaborableText);
const resDespesaCdS = validarIConvertirImport(despesaCapSetmanaText);

if (!resPressupost.valid) { console.error("Error en Pressupost:", resPressupost.error); hiHaError = true; }
if (!resTransport.valid) { console.error("Error en Transport:", resTransport.error); hiHaError = true; }
if (!resPreuNit.valid) { console.error("Error en Preu per Nit:", resPreuNit.error); hiHaError = true; }
if (!resDespesaLab.valid) { console.error("Error en Despesa Laborable:", resDespesaLab.error); hiHaError = true; }
if (!resDespesaCdS.valid) { console.error("Error en Despesa Cap de Setmana:", resDespesaCdS.error); hiHaError = true; }

if (!hiHaError) {
    
    const dies = diesNum;
    const nits = dies - 1; 
    const transportCents = resTransport.valorCents;
    const preuNitCents = resPreuNit.valorCents;
    const despesaLabCents = resDespesaLab.valorCents;
    const pressupostCents = resPressupost.valorCents;

    let acumulatCents = 0;

    console.log(`==================================================`);
    console.log(` DETALL DIARI DEL VIATGE (${dies} dies, ${nits} nits)`);
    console.log(`==================================================`);

    for (let i = 1; i <= dies; i++) {
        const transportDiaCents = (i === 1) ? transportCents : 0;
        const allotjamentDiaCents = (i < dies) ? preuNitCents : 0;
        const despesaDiaCents = despesaLabCents;
        const costDiaCents = transportDiaCents + allotjamentDiaCents + despesaDiaCents;
        acumulatCents += costDiaCents;

        console.log(
            `Dia ${i}: Transport: ${(transportDiaCents / 100).toFixed(2)} € | ` +
            `Allotjament: ${(allotjamentDiaCents / 100).toFixed(2)} € | ` +
            `Despesa: ${(despesaDiaCents / 100).toFixed(2)} € | ` +
            `Cost Dia: ${(costDiaCents / 100).toFixed(2)} € | ` +
            `Acumulat: ${(acumulatCents / 100).toFixed(2)} €`
        );
    }

    const totalAllotjamentCents = nits * preuNitCents;
    const totalDespesaCents = dies * despesaLabCents;
    const costTotalCents = acumulatCents; 

    const costTotal = costTotalCents / 100;
    const pressupost = pressupostCents / 100;
    const saldo = pressupost - costTotal;
    const mitjana = costTotal / dies;

    let estat = "";
    if (costTotal > pressupost) {
        estat = "Insuficient";
    } else if (costTotal >= pressupost * 0.90) {
        estat = "Ajustat";
    } else {
        estat = "Suficient";
    }

    console.log(`==================================================`);
    console.log(` RESUM GLOBAL DEL PRESSUPOST`);
    console.log(`==================================================`);
    console.log(`Dies: ${dies} | Nits: ${nits}`);
    console.log(`Total Allotjament: ${(totalAllotjamentCents / 100).toFixed(2)} €`);
    console.log(`Total Despesa Diària: ${(totalDespesaCents / 100).toFixed(2)} €`);
    console.log(`Total Transport: ${(transportCents / 100).toFixed(2)} €`);
    console.log(`Cost Total: ${costTotal.toFixed(2)} €`);
    console.log(`Saldo Disponible: ${saldo.toFixed(2)} €`);
    console.log(`Mitjana per Dia: ${mitjana.toFixed(2)} €`);
    console.log(`Estat del Pressupost: ${estat}`);
    console.log(`==================================================`);
}