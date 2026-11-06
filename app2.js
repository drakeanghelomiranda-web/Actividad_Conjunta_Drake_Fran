// 1. Variables inicials ------------
const diesText = "4";
const pressupostText = "500";
const transportText = "120";
const preuNitText = "65";
const despesaLaborableText = "30";
const despesaCapSetmanaText = "45";

// 2. Conversió de dades ------------
const dies = Number(diesText);
const pressupost = Number(pressupostText);
const transport = Number(transportText);
const preuNit = Number(preuNitText);
const despesaLaborable = Number(despesaLaborableText);

// Valida que el dia no estiguibuit, sigui un nombre
const diesValid = diesText.trim() !== "" && Number.isInteger(dies) && dies >= 1 && dies <= 30;

// Comprova import vàlid (finit, no buit i >= 0)
const esImportValid = (text, valor) => text.trim() !== "" && Number.isFinite(valor) && valor >= 0;

// Amb anterior, verifica que no hi hagi més de dos decimals
const teMaximDosDecimals = (text) => {
  const parts = text.trim().split(".");
  return parts.length === 1 || parts[1].length <= 2;
};

// Comprovacions juntant diferents validacions per a cada
const pressupostValid = esImportValid(pressupostText, pressupost) && pressupost > 0 && teMaximDosDecimals(pressupostText);
const transportValid = esImportValid(transportText, transport) && teMaximDosDecimals(transportText);
const preuNitValid = esImportValid(preuNitText, preuNit) && teMaximDosDecimals(preuNitText);
const despesaLaborableValid = esImportValid(despesaLaborableText, despesaLaborable) && teMaximDosDecimals(despesaLaborableText);

// Usa totes les comprovacions
const totValid = diesValid && pressupostValid && transportValid && preuNitValid && despesaLaborableValid;

if (totValid) {
    // 3. Càlculs principals ------------
  const nits = dies - 1; // El darrer dia no compta
  const costAllotjamentTotal = nits * preuNit;
  const despesaDiariaTotal = dies * despesaLaborable; // Aquí encara no es té en compte si és cap de setmana o no
  const costTotal = transport + costAllotjamentTotal + despesaDiariaTotal;
  const saldo = pressupost - costTotal;
  const mitjanaDiaria = costTotal / dies;

  // Clasificació del pressupost
  let estat;
  if (costTotal > pressupost) {
    estat = "Insuficient";
  } else if (costTotal >= pressupost * 0.9) {
    estat = "Ajustat";
  } else {
    estat = "Suficient";
  }

  // 4. Sortida de resum per consola ------------
  console.log(`--- RESUM DEL VIATGE ---`);
  console.log(`Dies: ${dies} | Nits: ${nits}`);
  console.log(`Allotjament total: ${costAllotjamentTotal.toFixed(2)} €`);
  console.log(`Despesa diària total: ${despesaDiariaTotal.toFixed(2)} €`);
  console.log(`Transport: ${transport.toFixed(2)} €`);
  console.log(`Cost total: ${costTotal.toFixed(2)} €`);
  console.log(`Saldo disponible: ${saldo.toFixed(2)} €`);
  console.log(`Mitjana per dia: ${mitjanaDiaria.toFixed(2)} €`);
  console.log(`Estat del pressupost: ${estat}`);

  // 5. Bucle de desglossament diari i acumulats ------------
  console.log(`\n--- DETALL DIA A DIA ---`);
  let acumulat = 0; // Inicialitzat abans del bucle

  for (let dia = 1; dia <= dies; dia++) {
    // El transport només es cobra el primer dia
    const importTransportDia = (dia === 1) ? transport : 0;
    // L'allotjament es cobra tots els dies excepte el darrer
    const importAllotjamentDia = (dia < dies) ? preuNit : 0;
    const importDespesaDia = despesaLaborable;

    const costDia = importTransportDia + importAllotjamentDia + importDespesaDia;
    acumulat += costDia;

    console.log(
      `Dia ${dia}: Transport ${importTransportDia.toFixed(2)} € | Allotjament ${importAllotjamentDia.toFixed(2)} € | Despesa ${importDespesaDia.toFixed(2)} € | Cost dia: ${costDia.toFixed(2)} € | Acumulat: ${acumulat.toFixed(2)} €`
    );
  }

  // Comprovació de seguretat
  console.log(`\nComprovació de suma: El total acumulat (${acumulat.toFixed(2)} €) coincideix amb el cost total (${costTotal.toFixed(2)} €): ${acumulat === costTotal}`);
} else {
    console.error("Error de validació: Comprova que les dades no estiguin buides, siguin nombres vàlids i compleixin els rangs.");
}

// Forzamos el error usando .toFixed() sobre la variable original
console.log(transportText.toFixed(2));

// Solución: primero parsear y luego redondear
console.log(transport.toFixed(2));