import type { Campaign, ProductTruth } from '@nestaffiliate/core';
import { calculateNestScore } from '@nestaffiliate/scoring';

const now = new Date().toISOString();

export const products: ProductTruth[] = [
  {
    productId: 'demo-meli-1',
    organizationId: 'demo-org',
    marketplace: 'MELI',
    externalId: 'MLB-DEMO-1',
    title: { value: 'Organizador Giratório Multiuso', source: 'demo-fixture', observedAt: now },
    url: { value: 'https://www.mercadolivre.com.br/', source: 'demo-fixture', observedAt: now },
    affiliateUrl: { value: 'https://www.mercadolivre.com.br/', source: 'manual-demo', observedAt: now },
    price: { value: 69.9, source: 'demo-fixture', observedAt: now },
    currency: { value: 'BRL', source: 'demo-fixture', observedAt: now },
    sellerName: { value: 'Loja demonstrativa', source: 'demo-fixture', observedAt: now },
    sellerReputation: { value: 0.96, source: 'demo-fixture', observedAt: now },
    availability: { value: 'available', source: 'demo-fixture', observedAt: now },
    assetRights: 'GENERATED',
  },
  {
    productId: 'demo-shopee-2',
    organizationId: 'demo-org',
    marketplace: 'SHOPEE',
    externalId: 'SHOPEE-DEMO-2',
    title: { value: 'Kit Organizador de Gavetas', source: 'demo-fixture', observedAt: now },
    url: { value: 'https://shopee.com.br/', source: 'demo-fixture', observedAt: now },
    affiliateUrl: { value: 'https://shopee.com.br/', source: 'manual-demo', observedAt: now },
    price: { value: 49.9, source: 'demo-fixture', observedAt: now },
    currency: { value: 'BRL', source: 'demo-fixture', observedAt: now },
    sellerName: { value: 'Loja demonstrativa', source: 'demo-fixture', observedAt: now },
    availability: { value: 'available', source: 'demo-fixture', observedAt: now },
    assetRights: 'GENERATED',
  },
];

export const demoCampaigns: Campaign[] = [
  {
    id: 'campaign-01',
    organizationId: 'demo-org',
    status: 'READY',
    marketplace: 'MELI',
    score: calculateNestScore({
      trend: 17, intent: 15, visual: 14, yield: 11, quality: 11,
      competition: 8, creative: 8, seasonality: 3, dataConfidence: 4,
    }),
    currentVersion: {
      id: 'campaign-01-v1', campaignId: 'campaign-01', version: 1, createdAt: now, reason: 'initial',
      product: products[0]!,
      narrative: {
        headline: 'Mais espaço sem reformar sua cozinha',
        subheadline: 'Uma ideia simples para deixar a bancada mais leve.',
        pinterestTitle: 'Como ganhar espaço em uma cozinha pequena',
        description: 'Uma solução prática para organizar itens do dia a dia e aproveitar melhor a bancada. Conteúdo com link de afiliado.',
        disclosure: 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
        altText: 'Composição editorial sobre organização de cozinha pequena com destaque para um organizador giratório.',
        cta: 'Ver a ideia',
      },
      boardName: 'Cozinha Pequena e Organizada',
      keyword: 'cozinha pequena',
      template: 'Editorial Premium',
    },
    history: [],
  },
  {
    id: 'campaign-02',
    organizationId: 'demo-org',
    status: 'READY',
    marketplace: 'SHOPEE',
    score: calculateNestScore({
      trend: 15, intent: 14, visual: 13, yield: 12, quality: 9,
      competition: 8, creative: 7, seasonality: 3, dataConfidence: 3,
    }),
    currentVersion: {
      id: 'campaign-02-v1', campaignId: 'campaign-02', version: 1, createdAt: now, reason: 'initial',
      product: products[1]!,
      narrative: {
        headline: 'A gaveta muda quando cada coisa tem lugar',
        subheadline: 'Organização visual sem complicar a rotina.',
        pinterestTitle: 'Ideias para organizar gavetas de cozinha',
        description: 'Um jeito simples de separar utensílios e reduzir a bagunça visual. Conteúdo com link de afiliado.',
        disclosure: 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
        altText: 'Pin editorial sobre organização de gavetas e divisórias para cozinha.',
        cta: 'Conferir opções',
      },
      boardName: 'Organização de Cozinha',
      keyword: 'organização de gavetas',
      template: 'Problem → Solution',
    },
    history: [],
  },
  {
    id: 'campaign-03',
    organizationId: 'demo-org',
    status: 'READY',
    marketplace: 'MELI',
    score: calculateNestScore({
      trend: 14, intent: 15, visual: 12, yield: 10, quality: 11,
      competition: 9, creative: 7, seasonality: 3, dataConfidence: 4,
    }),
    currentVersion: {
      id: 'campaign-03-v1', campaignId: 'campaign-03', version: 1, createdAt: now, reason: 'initial',
      product: products[0]!,
      narrative: {
        headline: 'O canto da bancada que pode trabalhar melhor',
        subheadline: 'Menos objetos soltos. Mais espaço útil.',
        pinterestTitle: 'Organização inteligente para bancada pequena',
        description: 'Uma ideia editorial para aproveitar melhor espaços compactos na cozinha. Conteúdo com link de afiliado.',
        disclosure: 'Conteúdo com link de afiliado. Posso receber comissão por compras qualificadas, sem custo adicional para você.',
        altText: 'Ideia de organização inteligente para bancada pequena.',
        cta: 'Ver detalhes',
      },
      boardName: 'Produtos que Facilitam a Rotina',
      keyword: 'organização bancada',
      template: 'Minimal',
    },
    history: [],
  },
];

export const initialBoards = [
  'Cozinha Pequena e Organizada',
  'Organização de Cozinha',
  'Ideias para Apartamento Pequeno',
  'Casa Bonita Gastando Pouco',
  'Organização de Banheiro',
  'Quarto Organizado e Aconchegante',
  'Lavanderia Pequena e Funcional',
  'Achados Inteligentes para Casa',
  'Decoração Simples e Bonita',
  'Produtos que Facilitam a Rotina',
];
