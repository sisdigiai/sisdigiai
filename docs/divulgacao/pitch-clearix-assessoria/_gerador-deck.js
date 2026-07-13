const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const RDS = require("react-dom/server");
const FA = require("react-icons/fa");

// ---- Marca Clearix ----
const NAVY="1A3A5C", NAVY_DEEP="0F2942", CYAN="06B6D4", CYAN_BRIGHT="22D3EE",
      ACTION="2563EB", ACTION_DEEP="1E40AF", BG="FAFAF9", CARD="FFFFFF",
      INK="1C1917", SUB="57534E", MUTED="8A8581", LINE="E7E5E4",
      CHIP="E0F2FE", CHIPINK="0C4A6E", LIGHT="AEC6DA", FAINT="7E97AC";
const FH="Inter", FB="Inter";

function markSvg(arc,dot){
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="85" cy="50" r="7" fill="${dot}"/><path d="M 74.75 25.25 A 35 35 0 1 0 74.75 74.75" stroke="${arc}" stroke-width="14" stroke-linecap="round" fill="none"/></svg>`;
}
function gradSvg(stops){
  return `<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="28%" cy="22%" r="95%">${stops}</radialGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>`;
}
async function uri(svg,w){
  const png = await sharp(Buffer.from(svg),{density:300}).resize({width:w}).png().toBuffer();
  return "image/png;base64,"+png.toString("base64");
}
async function iconUri(Comp,color){
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp,{color,size:"256"}));
  const png = await sharp(Buffer.from(svg)).resize({width:256}).png().toBuffer();
  return "image/png;base64,"+png.toString("base64");
}

(async ()=>{
  const navyMark  = await uri(markSvg("#1A3A5C","#06B6D4"),440);
  const whiteMark = await uri(markSvg("#FFFFFF","#22D3EE"),440);
  const bgNavy = await uri(gradSvg('<stop offset="0%" stop-color="#1C436A"/><stop offset="52%" stop-color="#102A43"/><stop offset="100%" stop-color="#091C2F"/>'),1600);
  const bgBlue = await uri(gradSvg('<stop offset="0%" stop-color="#2C53B8"/><stop offset="55%" stop-color="#193A86"/><stop offset="100%" stop-color="#0E2156"/>'),1600);

  const I = {};
  for (const [k,c] of [
    ["userSlash",FA.FaUserSlash],["glasses",FA.FaGlasses],["receipt",FA.FaCashRegister],["whats",FA.FaWhatsapp],
    ["cart",FA.FaShoppingCart],["cogs",FA.FaCogs],["wallet",FA.FaWallet],["bell",FA.FaBell],
    ["lock",FA.FaLock],["search",FA.FaSearch],["brain",FA.FaBrain],["bolt",FA.FaBolt],
  ]) I[k] = await iconUri(c,"#FFFFFF");

  const p = new pptxgen();
  p.defineLayout({ name:"W16x9", width:10, height:5.625 });
  p.layout = "W16x9";
  p.author="DIGIAI"; p.company="Clearix"; p.title="Clearix — Pitch Óticas";

  const W=10,H=5.625,M=0.55;
  const sh=()=>({type:"outer",color:"1A3A5C",blur:9,offset:3,angle:135,opacity:0.13});

  function logo(s,x,y,dark,size=0.46){
    s.addImage({data:dark?whiteMark:navyMark,x,y,w:size,h:size});
    s.addText("Clearix",{x:x+size+0.05,y,w:2.2,h:size,margin:0,fontFace:FH,fontSize:20,bold:true,color:dark?"FFFFFF":NAVY,valign:"middle"});
  }
  function motif(s){ s.addImage({data:navyMark,x:9.2,y:0.34,w:0.28,h:0.28}); }
  function kicker(s,t,x=M,y=0.4,color=CYAN){ s.addText(t,{x,y,w:6,h:0.3,margin:0,fontFace:FH,fontSize:11,bold:true,color,charSpacing:2.5}); }
  function title(s,t,sub,y=0.66){
    s.addText(t,{x:M,y,w:W-2*M-0.5,h:0.6,margin:0,fontFace:FH,fontSize:27,bold:true,color:INK,valign:"middle"});
    if(sub)s.addText(sub,{x:M,y:y+0.66,w:W-2*M,h:0.4,margin:0,fontFace:FB,fontSize:14,color:SUB,valign:"middle"});
  }
  function rrect(s,x,y,w,h,o={}){
    const opt={x,y,w,h,rectRadius:(o.r!=null?o.r:0.09),fill:{color:o.fill||CARD},line:{color:o.line||LINE,width:o.lw||0.75}};
    if(!o.noShadow)opt.shadow=sh();
    s.addShape(p.shapes.ROUNDED_RECTANGLE,opt);
  }
  function dot(s,x,y,c=CYAN,d=0.11){ s.addShape(p.shapes.OVAL,{x,y,w:d,h:d,fill:{color:c}}); }
  function iconCircle(s,x,y,d,key,circle=CYAN){
    s.addShape(p.shapes.OVAL,{x,y,w:d,h:d,fill:{color:circle},shadow:{type:"outer",color:"06B6D4",blur:7,offset:0,angle:90,opacity:0.25}});
    s.addImage({data:I[key],x:x+d*0.26,y:y+d*0.26,w:d*0.48,h:d*0.48});
  }

  // ===== 1 — CAPA =====
  let s=p.addSlide(); s.background={data:bgNavy};
  s.addImage({data:whiteMark,x:6.6,y:0.2,w:4.6,h:4.6,transparency:91});
  logo(s,M,0.5,true,0.5);
  s.addText("O ecossistema operacional\nda sua ótica",{x:M,y:1.95,w:8.85,h:1.5,margin:0,fontFace:FH,fontSize:40,bold:true,color:"FFFFFF",lineSpacingMultiple:1.02});
  dot(s,M+0.02,3.64,CYAN_BRIGHT,0.14);
  s.addText("Vender, produzir no laboratório, cobrar e fidelizar — tudo num lugar só.",{x:M+0.28,y:3.47,w:8,h:0.5,margin:0,fontFace:FB,fontSize:16,color:LIGHT,valign:"middle"});
  s.addText("Apresentação para [Nome da Ótica]   ·   Junho de 2026",{x:M,y:4.95,w:8,h:0.4,margin:0,fontFace:FB,fontSize:12,color:FAINT});

  // ===== 2 — SOA FAMILIAR =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"O PROBLEMA");
  title(s,"Soa familiar?","O dia a dia de uma ótica sem sistema integrado.",0.78);
  const pains=[["userSlash","O cliente que sumiu","Comprou há 8 meses. Ninguém ligou."],
    ["glasses","A lente perdida","Some entre a venda e o laboratório."],
    ["receipt","O caixa no papel","Fechando à mão, de novo, hoje à noite."],
    ["whats","O WhatsApp pessoal","Lotado, sem histórico, no celular do vendedor."]];
  pains.forEach((c,i)=>{
    const x=i%2===0?M:5.15, y=i<2?1.92:3.42;
    rrect(s,x,y,4.3,1.38);
    iconCircle(s,x+0.28,y+0.34,0.7,c[0]);
    s.addText(c[1],{x:x+1.12,y:y+0.24,w:3.0,h:0.4,margin:0,fontFace:FH,fontSize:16,bold:true,color:INK,valign:"middle"});
    s.addText(c[2],{x:x+1.12,y:y+0.66,w:3.0,h:0.5,margin:0,fontFace:FB,fontSize:12,color:SUB});
  });
  s.addText("Não é falta de esforço. É falta de sistema.",{x:M,y:4.95,w:8.9,h:0.42,margin:0,fontFace:FH,fontSize:15,italic:true,bold:true,color:NAVY,align:"center"});

  // ===== 3 — 3 DORES =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"POR QUE TRAVA");
  title(s,"As 3 dores que travam o crescimento","Têm a mesma raiz: informação espalhada.",0.78);
  const dores=[["01","O cliente some","Recall manual fica em ~3% dos clientes.","Cada cliente perdido = R$ 800–1.500"],
    ["02","Caos de sistemas","PDV, estoque, laboratório e caixa soltos.","O mesmo dado digitado 3×"],
    ["03","Não escala","Sem visão consolidada da rede.","A 2ª loja é dor. A 5ª, pesadelo."]];
  dores.forEach((c,i)=>{
    const x=[M,3.72,6.89][i];
    rrect(s,x,1.92,2.86,3.05);
    s.addText(c[0],{x:x+0.28,y:2.12,w:2.3,h:0.6,margin:0,fontFace:FH,fontSize:30,bold:true,color:CYAN});
    s.addText(c[1],{x:x+0.28,y:2.76,w:2.3,h:0.4,margin:0,fontFace:FH,fontSize:16,bold:true,color:INK});
    s.addText(c[2],{x:x+0.28,y:3.2,w:2.34,h:0.7,margin:0,fontFace:FB,fontSize:12.5,color:SUB});
    rrect(s,x+0.28,4.16,2.3,0.62,{fill:CHIP,line:CHIP,noShadow:true,r:0.06});
    s.addText(c[3],{x:x+0.4,y:4.16,w:2.06,h:0.62,margin:0,fontFace:FH,fontSize:11.5,bold:true,color:CHIPINK,valign:"middle"});
  });

  // ===== 4 — ECOSSISTEMA =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"A VIRADA");
  title(s,"Um ecossistema, não mais um programa.",null,0.78);
  const eco=["Login único — entra uma vez, usa tudo.","Cada loja vê só o que é dela.","O dado entra uma vez e flui sozinho.","Acaba a planilha solta e o caderno do laboratório."];
  s.addText(eco.map(t=>({text:t,options:{bullet:{code:"2022",indent:18},breakLine:true,paraSpaceAfter:12}})),
    {x:M,y:1.9,w:4.5,h:2.9,margin:0,fontFace:FB,fontSize:15.5,color:INK});
  rrect(s,5.5,1.78,3.95,3.3,{fill:"F1F5F9",line:"E2E8F0"});
  s.addText("UM LOGIN, SEIS FRENTES",{x:5.78,y:2.0,w:3.4,h:0.35,margin:0,fontFace:FH,fontSize:11,bold:true,color:MUTED,charSpacing:2});
  ["Vendas (PDV + carnê)","Laboratório (DCL)","Financeiro","Clínica & receitas","Marketing & fidelidade","BI com IA"].forEach((m,i)=>{
    const y=2.46+i*0.42; dot(s,5.82,y+0.07,CYAN,0.12);
    s.addText(m,{x:6.06,y,w:3.2,h:0.38,margin:0,fontFace:FB,fontSize:13.5,color:INK,valign:"middle"});
  });

  // ===== 5 — PROVA (dark + gráfico acumulado) =====
  s=p.addSlide(); s.background={data:bgNavy};
  logo(s,M,0.42,true,0.4);
  kicker(s,"PROVA REAL",M,1.05,CYAN_BRIGHT);
  s.addText("Isto não é maquete.",{x:M,y:1.3,w:9,h:0.6,margin:0,fontFace:FH,fontSize:32,bold:true,color:"FFFFFF"});
  s.addText("Já roda uma rede de verdade, em produção.",{x:M,y:1.92,w:5,h:0.4,margin:0,fontFace:FB,fontSize:14,color:LIGHT});
  const stats=[["R$ 12,2M","faturados no histórico"],["20.597","vendas processadas"],["50 mil","ordens de laboratório"],["19 mil","pacientes atendidos"]];
  stats.forEach((st,i)=>{
    const x=i%2===0?M:2.62, y=i<2?2.45:3.5;
    s.addText(st[0],{x,y,w:2.0,h:0.5,margin:0,fontFace:FH,fontSize:25,bold:true,color:CYAN_BRIGHT});
    s.addText(st[1],{x,y:y+0.5,w:2.1,h:0.35,margin:0,fontFace:FB,fontSize:11,color:LIGHT});
  });
  s.addText("Faturamento acumulado (R$ milhões)",{x:5.0,y:2.18,w:4.5,h:0.3,margin:0,fontFace:FH,fontSize:10.5,bold:true,color:FAINT,charSpacing:1});
  s.addChart(p.charts.AREA,[{name:"Acumulado",labels:["2020","2021","2022","2023","2024","2025","'26"],values:[0.31,2.15,4.99,8.16,10.59,11.71,12.24]}],{
    x:4.85,y:2.45,w:4.7,h:2.15,chartColors:["22D3EE"],chartArea:{fill:{color:"0E2A45"}},
    catAxisLabelColor:"9FB6C9",valAxisLabelColor:"9FB6C9",catAxisLabelFontSize:9,valAxisLabelFontSize:9,
    valGridLine:{color:"1E3A57",size:0.5},catGridLine:{style:"none"},showLegend:false,lineSmooth:true,showTitle:false,
  });
  s.addText("Grupo Mello — 10 lojas, 5+ anos de operação 100% no Clearix.",{x:M,y:4.78,w:9,h:0.35,margin:0,fontFace:FB,fontSize:12,italic:true,color:FAINT});

  // ===== 6 — CICLO =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"COMO FUNCIONA");
  title(s,"Um fluxo só, da venda à entrega","Sem ninguém digitar a mesma coisa duas vezes.",0.78);
  const steps=[["01","Vender","PDV + carnê","cart"],["02","Produzir","Lab em kanban","cogs"],["03","Cobrar","Financeiro","wallet"],["04","Avisar","WhatsApp + portal","bell"]];
  const sx=[0.55,2.867,5.184,7.501];
  steps.forEach((st,i)=>{
    const x=sx[i]; rrect(s,x,2.35,1.95,2.05);
    iconCircle(s,x+0.7,2.55,0.55,st[3]);
    s.addText(st[0],{x,y:3.16,w:1.95,h:0.4,margin:0,fontFace:FH,fontSize:18,bold:true,color:CYAN,align:"center"});
    s.addText(st[1],{x,y:3.54,w:1.95,h:0.36,margin:0,fontFace:FH,fontSize:15,bold:true,color:INK,align:"center"});
    s.addText(st[2],{x:x+0.1,y:3.92,w:1.75,h:0.36,margin:0,fontFace:FB,fontSize:11,color:SUB,align:"center"});
  });
  [2.5,4.817,7.134].forEach(xe=>s.addText("›",{x:xe-0.02,y:3.0,w:0.4,h:0.6,margin:0,fontFace:FH,fontSize:28,bold:true,color:CYAN,align:"center",valign:"middle"}));
  s.addText("Cada etapa alimenta a próxima automaticamente.",{x:M,y:4.62,w:8.9,h:0.4,margin:0,fontFace:FB,fontSize:13,italic:true,color:MUTED,align:"center"});

  // ===== 7 — GANHOS =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"NA PRÁTICA");
  title(s,"O que cada etapa entrega",null,0.78);
  const gains=[["cart","Vender","Crediário próprio da loja, sem taxa de terceiro. Menos venda perdida por desorganização."],
    ["cogs","Produzir","A lente nunca se perde. O laboratório sabe o que fazer. Alerta automático de atraso."],
    ["wallet","Cobrar","Contas, parcelas e fluxo num lugar só. Uma IA explica o resultado do mês em português."],
    ["bell","Avisar","WhatsApp automático quando o óculos fica pronto. Portal do paciente sem senha."]];
  gains.forEach((c,i)=>{
    const x=i%2===0?M:5.15, y=i<2?1.78:3.42;
    rrect(s,x,y,4.3,1.5);
    iconCircle(s,x+0.3,y+0.3,0.62,c[0]);
    s.addText(c[1],{x:x+1.06,y:y+0.22,w:3.0,h:0.4,margin:0,fontFace:FH,fontSize:16,bold:true,color:CYAN,valign:"middle"});
    s.addText(c[2],{x:x+1.06,y:y+0.64,w:3.05,h:0.78,margin:0,fontFace:FB,fontSize:12.5,color:SUB});
  });

  // ===== 8 — DIFERENCIAIS =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"DIFERENCIAIS");
  title(s,"O que (quase) ninguém mais tem",null,0.78);
  const diff=[["lock","Portal do paciente\nsem senha","Acesso por link no WhatsApp: receita, histórico e status do pedido. LGPD por design."],
    ["search","Motor de lentes\ncanônico","Busque “Varilux” e veja todas as opções, de todos os fornecedores, com preço e margem."],
    ["brain","BI com\ninteligência","Pergunte em português. Veja de quais bairros vêm os seus clientes."]];
  diff.forEach((c,i)=>{
    const x=[M,3.72,6.89][i];
    rrect(s,x,1.82,2.86,2.85);
    iconCircle(s,x+0.3,2.1,0.66,c[0]);
    s.addText(c[1],{x:x+0.3,y:2.92,w:2.3,h:0.75,margin:0,fontFace:FH,fontSize:16,bold:true,color:INK,lineSpacingMultiple:1.0});
    s.addText(c[2],{x:x+0.3,y:3.72,w:2.34,h:0.9,margin:0,fontFace:FB,fontSize:12.5,color:SUB});
  });
  s.addText("E ainda vem por aí: prova virtual de óculos pelo celular (AR).",{x:M,y:4.82,w:8.9,h:0.32,margin:0,fontFace:FB,fontSize:12,italic:true,color:MUTED,align:"center"});

  // ===== 9 — QUANTO CUSTA =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"INVESTIMENTO");
  title(s,"Quanto custa",null,0.78);
  rrect(s,M,1.66,8.9,0.64,{fill:NAVY,line:NAVY,noShadow:true,r:0.07});
  s.addText([{text:"Recriar um sistema assim do zero custaria ",options:{color:"D6E2EE"}},{text:"mais de R$ 7,7 milhões",options:{bold:true,color:CYAN_BRIGHT}},{text:" e mais de um ano.",options:{color:"D6E2EE"}}],
    {x:M+0.2,y:1.66,w:8.5,h:0.64,margin:0,fontFace:FB,fontSize:14,valign:"middle",align:"center"});
  const tiers=[["Essencial","R$ 349","Ótica solo — 3 a 5 pessoas",false],["Controle","R$ 899","Multi-loja com laboratório",true],["Crescimento","R$ 1.499","+ BI + IA + escala",false]];
  tiers.forEach((t,i)=>{
    const x=[M,3.72,6.89][i];
    rrect(s,x,2.55,2.86,1.95,{fill:t[3]?"F0F9FF":CARD,line:t[3]?CYAN:LINE,lw:t[3]?1.5:0.75});
    if(t[3])s.addText("MAIS ESCOLHIDO",{x:x+0.28,y:2.45,w:2.3,h:0.3,margin:0,fontFace:FH,fontSize:9,bold:true,color:CYAN,charSpacing:1.5});
    s.addText(t[0],{x:x+0.28,y:2.78,w:2.3,h:0.4,margin:0,fontFace:FH,fontSize:17,bold:true,color:NAVY});
    s.addText([{text:t[1],options:{fontSize:24,bold:true,color:INK}},{text:" /mês",options:{fontSize:12,color:MUTED}}],{x:x+0.28,y:3.24,w:2.4,h:0.55,margin:0,fontFace:FH,valign:"middle"});
    s.addText(t[2],{x:x+0.28,y:3.86,w:2.34,h:0.55,margin:0,fontFace:FB,fontSize:12.5,color:SUB});
  });
  s.addText("Mercado Pago · sem cartão preso · sem fidelidade · Completo (rede/franquia): sob consulta.",{x:M,y:4.66,w:8.9,h:0.4,margin:0,fontFace:FH,fontSize:13,bold:true,color:NAVY,align:"center"});

  // ===== 10 — EXPERIMENTE (sandboxes) =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"EXPERIMENTE");
  title(s,"Não acredite — entre e veja","Acesso às 3 lojas-modelo, com dados reais de operação.",0.78);
  const sbox=[["Essencial","1 loja — operação enxuta"],["Controle","Multi-loja com laboratório"],["Crescimento","Rede + BI + IA + fidelidade"]];
  const sroles=["Dono — vê tudo + BI","Gerente — operação","Vendedor — balcão"];
  sbox.forEach((b,i)=>{
    const x=[M,3.72,6.89][i];
    rrect(s,x,1.9,2.86,2.8);
    dot(s,x+0.3,2.16,CYAN,0.14);
    s.addText(b[0],{x:x+0.52,y:2.04,w:2.1,h:0.36,margin:0,fontFace:FH,fontSize:16,bold:true,color:NAVY,valign:"middle"});
    s.addText(b[1],{x:x+0.3,y:2.48,w:2.34,h:0.5,margin:0,fontFace:FB,fontSize:12,color:SUB});
    s.addText("VOCÊ ENTRA COMO",{x:x+0.3,y:3.04,w:2.3,h:0.28,margin:0,fontFace:FH,fontSize:9.5,bold:true,color:MUTED,charSpacing:1.5});
    sroles.forEach((r,j)=>{ const y=3.36+j*0.4; dot(s,x+0.32,y+0.07,CYAN,0.1);
      s.addText(r,{x:x+0.54,y,w:2.1,h:0.34,margin:0,fontFace:FB,fontSize:12.5,color:INK,valign:"middle"}); });
  });
  s.addText("Entre com cada perfil e veja o sistema pelos olhos de quem usa — cada um enxerga só o que pode.",{x:M,y:4.84,w:8.9,h:0.34,margin:0,fontFace:FB,fontSize:12,italic:true,color:MUTED,align:"center"});

  // ===== 11 — OFERTA (blue grad) =====
  s=p.addSlide(); s.background={data:bgBlue};
  logo(s,M,0.45,true,0.4);
  kicker(s,"COMECE SEM RISCO",M,1.08,CYAN_BRIGHT);
  s.addText("A sua ótica, testada de verdade.",{x:M,y:1.32,w:9,h:0.6,margin:0,fontFace:FH,fontSize:30,bold:true,color:"FFFFFF"});
  const offer=[["bolt","30 dias grátis, sem cartão","Comece hoje, sem compromisso. Depois é mensal via Mercado Pago — sem cartão preso, sem fidelidade."],
    ["whats","Vai migrar de verdade? 90 dias + 30% OFF","90 dias com a sua empresa real e 30% OFF nos 3 primeiros meses ao virar cliente."],
    ["lock","Migração guiada","A gente traz seu histórico (orçada por volume). Nada se perde."]];
  offer.forEach((c,i)=>{
    const y=2.25+i*0.72;
    rrect(s,M,y,8.9,0.62,{fill:"2A50B8",line:"3B66D6",noShadow:true,r:0.08});
    iconCircle(s,M+0.16,y+0.11,0.4,c[0],CYAN_BRIGHT);
    s.addText([{text:c[1]+"   ",options:{bold:true,color:"FFFFFF"}},{text:c[2],options:{color:"CBD9F7"}}],{x:M+0.76,y,w:7.9,h:0.62,margin:0,fontFace:FB,fontSize:12.5,valign:"middle"});
  });
  s.addText("Você não compra confiando na minha palavra. Você usa — e decide depois.",{x:M,y:4.74,w:8.9,h:0.4,margin:0,fontFace:FB,fontSize:13,italic:true,color:"AEC0EE",align:"center"});

  // ===== 12 — COMO COMEÇA =====
  s=p.addSlide(); s.background={color:BG}; motif(s);
  kicker(s,"PRÓXIMO PASSO");
  title(s,"Como começa","Implantação em menos de 30 dias, sem parar a operação.",0.78);
  const go=[["1","Você acessa as 3 lojas-modelo hoje."],["2","Começa grátis (30 dias) — e 90 dias com a sua empresa ao decidir."],["3","Treinamos a equipe; migração guiada."]];
  go.forEach((c,i)=>{
    const x=[M,3.72,6.89][i];
    rrect(s,x,2.05,2.86,1.7);
    s.addShape(p.shapes.OVAL,{x:x+0.28,y:2.3,w:0.6,h:0.6,fill:{color:CYAN},shadow:{type:"outer",color:"06B6D4",blur:8,offset:0,angle:90,opacity:0.3}});
    s.addText(c[0],{x:x+0.28,y:2.3,w:0.6,h:0.6,margin:0,fontFace:FH,fontSize:22,bold:true,color:"FFFFFF",align:"center",valign:"middle"});
    s.addText(c[1],{x:x+0.28,y:3.05,w:2.34,h:0.66,margin:0,fontFace:FB,fontSize:13.5,color:INK});
  });
  rrect(s,2.4,4.15,5.2,0.78,{fill:ACTION,line:ACTION,noShadow:true,r:0.1});
  s.addText("Vamos liberar o seu acesso de teste agora?",{x:2.4,y:4.15,w:5.2,h:0.78,margin:0,fontFace:FH,fontSize:17,bold:true,color:"FFFFFF",align:"center",valign:"middle"});

  // ===== 13 — FECHAMENTO =====
  s=p.addSlide(); s.background={data:bgNavy};
  s.addImage({data:whiteMark,x:6.9,y:0.5,w:4.2,h:4.2,transparency:92});
  logo(s,M,0.5,true,0.5);
  s.addText("Sua ótica operando como\nrede nacional — começando\nesta semana.",{x:M,y:1.9,w:8.4,h:1.9,margin:0,fontFace:FH,fontSize:34,bold:true,color:"FFFFFF",lineSpacingMultiple:1.05});
  dot(s,M+0.02,4.02,CYAN_BRIGHT,0.14);
  s.addText("[Nome do consultor]   ·   [WhatsApp]   ·   clearix.app.br",{x:M+0.28,y:3.87,w:8,h:0.45,margin:0,fontFace:FB,fontSize:14,color:LIGHT,valign:"middle"});

  const out="D:/projetos/digiai/docs/divulgacao/pitch-clearix-assessoria/Clearix-Pitch-Oticas.pptx";
  await p.writeFile({fileName:out});
  console.log("OK ->",out);
})().catch(e=>{console.error("ERRO:",e);process.exit(1);});
