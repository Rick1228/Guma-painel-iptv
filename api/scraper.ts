import { createClient } from '@supabase/supabase-js';

// No Vercel Serverless, usamos process.env no lugar de import.meta.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  try {
    // 1. Busca todos os usuários ativos com suas configurações
    const { data: configuracoes, error: configError } = await supabase
      .from('configuracoes')
      .select('usuario_id, termos_busca, regras_pontuacao');

    if (configError || !configuracoes) {
      throw new Error('Falha ao buscar configurações');
    }

    let leadsCriados = 0;

    // 2. Para cada usuário, roda o scraper baseado nos termos dele
    for (const config of configuracoes) {
      if (!config.termos_busca || config.termos_busca.length === 0) continue;

      for (const termo of config.termos_busca) {
        // Busca na API pública do Reddit
        const query = encodeURIComponent(termo);
        const redditUrl = `https://www.reddit.com/search.json?q=${query}&sort=new&limit=3`;
        
        const response = await fetch(redditUrl, {
          headers: { 'User-Agent': 'GumaLeadsBot/1.0' }
        });

        if (!response.ok) continue;

        const json = await response.json();
        const posts = json.data?.children || [];

        for (const post of posts) {
          const postData = post.data;
          const autor = postData.author;
          const texto = postData.title + ' ' + (postData.selftext || '');
          const postUrl = `https://reddit.com${postData.permalink}`;

          // Evitar duplicados: Checar se essa interação já existe (pela URL/conteúdo exato)
          const { data: existeInteracao } = await supabase
            .from('interacoes')
            .select('id')
            .eq('conteudo', postUrl)
            .limit(1);

          if (existeInteracao && existeInteracao.length > 0) {
            continue; // Já capturamos esse post antes
          }

          // Calcular Score baseado nas regras do usuário
          let score = 0;
          let breakdown = [];
          const sinais_compra = [];

          if (config.regras_pontuacao) {
            for (const regra of config.regras_pontuacao) {
              if (regra.ativo && texto.toLowerCase().includes(regra.criterio.toLowerCase())) {
                score += regra.peso;
                breakdown.push({ regra: regra.criterio, peso: regra.peso });
                sinais_compra.push(regra.criterio);
              }
            }
          }

          // Dica: Apenas criar leads com score > 0 (que tiveram fit)
          if (score === 0) continue;

          // Inserir o Lead
          const { data: leadInserido, error: leadError } = await supabase
            .from('leads')
            .insert({
              nome: autor,
              fonte: 'Reddit',
              pontuacao_comportamental: score,
              score_breakdown: breakdown,
              status: score > 30 ? 'novo' : 'novo', // Pode ajustar lógica aqui
              sinais_compra: sinais_compra,
              bio: `Lead capturado automaticamente do Reddit no post: ${postData.title}`,
              usuario_id: config.usuario_id
            })
            .select('id')
            .single();

          if (leadError || !leadInserido) continue;

          // Inserir a Interação (que serve como comprovante e evita duplicidade futura)
          await supabase.from('interacoes').insert({
            lead_id: leadInserido.id,
            tipo: 'post',
            conteudo: postUrl, // Salvamos a URL aqui para usar na checagem de duplicidade
            plataforma: 'Reddit',
            engajamento: postData.score || 0
          });

          leadsCriados++;
        }
      }
    }

    return res.status(200).json({ success: true, message: `Scraping finalizado. ${leadsCriados} novos leads capturados.` });
  } catch (error: any) {
    console.error('Erro no Scraper:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
