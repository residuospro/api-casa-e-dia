const dashboardService =
  require("C:/Users/kalli/Documents/casa-em-dia/src/services/financeiro/dashboard.service")
    .dashboardService;

async function main() {
  const familiaId = "cmqo1zjuv0004112ujk9j109l";
  const inicio = new Date("2026-08-01");
  const fim = new Date("2026-08-31");

  const resultado = await dashboardService.fluxoCaixa(familiaId, inicio, fim, "MES");
  console.log(JSON.stringify(resultado, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
