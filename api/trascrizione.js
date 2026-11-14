// TuboF — le trascrizioni per ora no: YouTube spesso le blocca ai server nel cloud.
export default {
  async fetch() {
    const msg = 'In TuboF la lettura della trascrizione non è disponibile.';
    return new Response(JSON.stringify({ error: msg, errore: msg }), {
      status: 501,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
