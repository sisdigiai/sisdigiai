import type { CopyAsset, CopyCategory } from './copyStore';

import adsJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_criativos_ads.json';
import storiesJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_stories_carrossel.json';
import videoJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_video_scripts.json';
import emailJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_email_sequences.json';
import whatsappJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_whatsapp_bio.json';
import landingJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_landing_page.json';
import obrigadoJson from '../../docs_sync/05-marketing/produtos/otica-sem-improviso/05-copys-e-prompts/copy_pagina_obrigado.json';

function now(): string {
  return new Date().toISOString();
}

function makeAsset(
  id: string,
  category: CopyCategory,
  title: string,
  format: string,
  content: Record<string, unknown>,
  sourceFile: string,
  sortOrder: number,
  angulo?: string,
): CopyAsset {
  return {
    id,
    category,
    title,
    format,
    angulo,
    content,
    status: 'pendente',
    image_url: null,
    image_path: null,
    source_file: sourceFile,
    source_id: id,
    sort_order: sortOrder,
    created_at: now(),
    updated_at: now(),
  };
}

export function seedCopyAssets(): CopyAsset[] {
  const assets: CopyAsset[] = [];
  let order = 0;

  // --- Ads ---
  const ads = adsJson as { criativos?: Array<Record<string, unknown>> };
  if (ads.criativos) {
    for (const criativo of ads.criativos) {
      order++;
      assets.push(
        makeAsset(
          criativo.id as string,
          'ads',
          (criativo.headline as string) || (criativo.id as string),
          (criativo.formato as string) || 'feed_1x1',
          {
            headline: criativo.headline as string,
            corpo: criativo.corpo as string,
            cta: criativo.cta as string,
            texto_imagem: criativo.texto_imagem as string,
            nota_visual: criativo.nota_visual as string,
            roteiro: criativo.roteiro as string[] | undefined,
          },
          'copy_criativos_ads.json',
          order,
          criativo.angulo as string,
        ),
      );
    }
  }

  // --- Stories & Carrosséis ---
  const stories = storiesJson as {
    carrosseis?: Array<Record<string, unknown>>;
    stories?: Array<Record<string, unknown>>;
  };
  if (stories.carrosseis) {
    for (const carrossel of stories.carrosseis) {
      order++;
      const slides = carrossel.conteudo as Array<Record<string, unknown>>;
      assets.push(
        makeAsset(
          carrossel.id as string,
          'stories_carrossel',
          `Carrossel: ${(slides?.[0]?.texto_principal as string) || carrossel.id}`,
          (carrossel.formato as string) || 'carrossel',
          { slides, formato: carrossel.formato, total_slides: carrossel.slides },
          'copy_stories_carrossel.json',
          order,
        ),
      );
    }
  }
  if (stories.stories) {
    for (const story of stories.stories) {
      order++;
      assets.push(
        makeAsset(
          story.id as string,
          'stories_carrossel',
          `Stories: ${(story.nome as string) || story.id}`,
          'stories_9x16',
          { slides: story.conteudo, total_stories: story.total_stories },
          'copy_stories_carrossel.json',
          order,
        ),
      );
    }
  }

  // --- Vídeos ---
  const videos = videoJson as { videos?: Array<Record<string, unknown>> };
  if (videos.videos) {
    for (const video of videos.videos) {
      order++;
      const roteiro = (video.roteiro as Array<Record<string, unknown>>)?.map(
        (r) => `[${r.tempo}] ${r.fase}: ${r.texto}`,
      );
      assets.push(
        makeAsset(
          video.id as string,
          'video',
          `${video.tipo}: ${(video.roteiro as Array<Record<string, unknown>>)?.[0]?.texto || video.id}`,
          (video.formato as string) || 'reels_9x16',
          { roteiro, duracao: video.duracao, tipo: video.tipo, objetivo: video.objetivo },
          'copy_video_scripts.json',
          order,
        ),
      );
    }
  }

  // --- E-mails ---
  const emails = emailJson as { sequencias?: Array<Record<string, unknown>> };
  if (emails.sequencias) {
    for (const seq of emails.sequencias) {
      const emailList = seq.emails as Array<Record<string, unknown>>;
      if (emailList) {
        for (const email of emailList) {
          order++;
          assets.push(
            makeAsset(
              `${seq.id}-dia${email.dia}`,
              'email',
              `[${seq.nome}] ${email.assunto}`,
              'email',
              {
                assunto: email.assunto as string,
                preview: email.preview as string,
                corpo: email.corpo as string,
                cta: email.cta as string,
                dia: email.dia,
              },
              'copy_email_sequences.json',
              order,
            ),
          );
        }
      }
    }
  }

  // --- WhatsApp & Bio ---
  const whatsapp = whatsappJson as {
    bio_instagram?: Record<string, string>;
    whatsapp_broadcast?: Array<Record<string, unknown>>;
    whatsapp_status?: Array<Record<string, unknown>>;
  };
  if (whatsapp.bio_instagram) {
    for (const [key, value] of Object.entries(whatsapp.bio_instagram)) {
      order++;
      assets.push(
        makeAsset(
          `bio-${key}`,
          'whatsapp',
          `Bio IG: ${key}`,
          'bio_instagram',
          { corpo: value },
          'copy_whatsapp_bio.json',
          order,
        ),
      );
    }
  }
  if (whatsapp.whatsapp_broadcast) {
    for (const msg of whatsapp.whatsapp_broadcast) {
      order++;
      assets.push(
        makeAsset(
          msg.id as string,
          'whatsapp',
          `Broadcast: ${(msg.contexto as string) || msg.id}`,
          'whatsapp_broadcast',
          { mensagem: msg.mensagem as string, contexto: msg.contexto },
          'copy_whatsapp_bio.json',
          order,
        ),
      );
    }
  }
  if (whatsapp.whatsapp_status) {
    for (const status of whatsapp.whatsapp_status) {
      order++;
      assets.push(
        makeAsset(
          status.id as string,
          'whatsapp',
          `Status: ${(status.id as string).replace('status_', '')}`,
          'whatsapp_status',
          { corpo: status.texto as string },
          'copy_whatsapp_bio.json',
          order,
        ),
      );
    }
  }

  // --- Landing Page (seções) ---
  const landing = landingJson as { secoes?: Array<Record<string, unknown>> };
  if (landing.secoes) {
    for (const secao of landing.secoes) {
      order++;
      const elementos = secao.elementos as Record<string, unknown>;
      assets.push(
        makeAsset(
          `lp-${secao.id}`,
          'landing',
          `LP: ${(elementos?.titulo as string) || (secao.id as string)}`,
          'landing_section',
          { ...elementos, tipo_secao: secao.tipo },
          'copy_landing_page.json',
          order,
        ),
      );
    }
  }

  // --- Página de Obrigado ---
  const obrigado = obrigadoJson as { pagina?: Record<string, unknown> };
  if (obrigado.pagina) {
    order++;
    assets.push(
      makeAsset(
        'pagina-obrigado',
        'pagina_obrigado',
        `Thank You: ${(obrigado.pagina.titulo as string) || 'Pós-compra'}`,
        'pagina',
        obrigado.pagina,
        'copy_pagina_obrigado.json',
        order,
      ),
    );
  }

  return assets;
}
