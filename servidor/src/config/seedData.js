/**
 * Arquivo com dados iniciais para popular o banco de dados
 */

// Função para gerar data de validade futura (x meses a partir de hoje)
const getFutureDate = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

export const products = [
  {
    name: "Arroz Tipo 1 - 5kg",
    price: 18.99,
    description: "Arroz branco tipo 1 de alta qualidade, pacote de 5kg",
    quantity: 50,
    expire_date: getFutureDate(12), // Validade de 12 meses
    imageUrl: "https://conteudo.imguol.com.br/c/entretenimento/26/2020/03/27/arroz-1585335063700_v2_450x450.jpg"
  },
  {
    name: "Feijão Carioca - 1kg",
    price: 8.75,
    description: "Feijão carioca selecionado, pacote de 1kg",
    quantity: 40,
    expire_date: getFutureDate(10), // Validade de 10 meses
    imageUrl: "https://mercadoterra.s3.amazonaws.com/web/product/148571-feijao-carioca-camil-1kg.jpg"
  },
  {
    name: "Açúcar Refinado - 1kg",
    price: 4.50,
    description: "Açúcar refinado de primeira qualidade",
    quantity: 30,
    expire_date: getFutureDate(15), // Validade de 15 meses
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/619/631619.jpg"
  },
  {
    name: "Café em Pó - 500g",
    price: 9.90,
    description: "Café torrado e moído, embalagem a vácuo",
    quantity: 25,
    expire_date: getFutureDate(8), // Validade de 8 meses
    imageUrl: "https://io.convertiez.com.br/m/superpaguemenos/shop/products/images/25131/medium/cafe-em-po-melitta-tradicao-500g_85521.png"
  },
  {
    name: "Leite Integral - 1L",
    price: 4.25,
    description: "Leite integral UHT, embalagem Tetra Pak",
    quantity: 60,
    expire_date: getFutureDate(4), // Validade de 4 meses
    imageUrl: "https://io.convertiez.com.br/m/superpaguemenos/shop/products/images/36279/medium/leite-longa-vida-integral-itambe-1-litro_77117.png"
  },
  {
    name: "Óleo de Soja - 900ml",
    price: 6.79,
    description: "Óleo de soja refinado tipo 1",
    quantity: 45,
    expire_date: getFutureDate(18), // Validade de 18 meses
    imageUrl: "https://d2r9epyceweg5n.cloudfront.net/stores/001/010/266/products/oleo-de-soja-soya1-f88bc61a7a23794fca15086772629568-640-0.jpg"
  },
  {
    name: "Macarrão Espaguete - 500g",
    price: 3.50,
    description: "Macarrão tipo espaguete nº8, grano duro",
    quantity: 35,
    expire_date: getFutureDate(14), // Validade de 14 meses
    imageUrl: "https://static.clubeextra.com.br/img/uploads/1/247/590247.jpg"
  },
  {
    name: "Sal Refinado - 1kg",
    price: 2.20,
    description: "Sal refinado iodado",
    quantity: 40,
    expire_date: getFutureDate(24), // Validade de 24 meses
    imageUrl: "https://www.imigrantesbebidas.com.br/bebida/images/products/full/1984-sal-refinado-cisne-1kg.jpg"
  },
  {
    name: "Farinha de Trigo - 1kg",
    price: 5.30,
    description: "Farinha de trigo enriquecida com ferro e ácido fólico",
    quantity: 30,
    expire_date: getFutureDate(9), // Validade de 9 meses
    imageUrl: "https://io.convertiez.com.br/m/superpaguemenos/shop/products/images/8105/medium/farinha-de-trigo-tradicional-dona-benta-01kg_64182.png"
  },
  {
    name: "Molho de Tomate - 340g",
    price: 2.95,
    description: "Molho de tomate tradicional em embalagem tetra pak",
    quantity: 50,
    expire_date: getFutureDate(11), // Validade de 11 meses
    imageUrl: "https://cdn.shoppub.io/cdn-cgi/image/w=1000,h=1000,q=80,f=auto/oficinadoarroz/media/uploads/produtos/foto/lbexpprx/molho-de-tomate-tradicional-fugini-sachê-340g.jpg"
  },
  // Adicionando produtos de carne
  {
    name: "Frango Inteiro Congelado - 2kg",
    price: 19.90,
    description: "Frango inteiro congelado, aproximadamente 2kg",
    quantity: 30,
    expire_date: getFutureDate(3),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/66/661066.jpg"
  },
  {
    name: "Coxas de Frango - 1kg",
    price: 14.50,
    description: "Pacote de coxas de frango congeladas, aproximadamente 1kg",
    quantity: 40,
    expire_date: getFutureDate(3),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/100/547100.png"
  },
  {
    name: "Peito de Frango - 1kg",
    price: 16.99,
    description: "Peito de frango sem osso congelado, aproximadamente 1kg",
    quantity: 35,
    expire_date: getFutureDate(3),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/429/19565429.jpg"
  },
  {
    name: "Carne Moída - 500g",
    price: 15.75,
    description: "Carne bovina moída de primeira, embalagem de 500g",
    quantity: 25,
    expire_date: getFutureDate(2),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/345/679345.png"
  },
  {
    name: "Alcatra Bovina - 1kg",
    price: 39.90,
    description: "Carne bovina alcatra, peça de aproximadamente 1kg",
    quantity: 20,
    expire_date: getFutureDate(2),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/207/641207.jpg"
  },
  {
    name: "Linguiça Toscana - 500g",
    price: 12.50,
    description: "Linguiça toscana suína para churrasco, pacote de 500g",
    quantity: 30,
    expire_date: getFutureDate(3),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/367/19531367.jpg"
  },
  {
    name: "Picanha Bovina - 1kg",
    price: 69.90,
    description: "Picanha bovina congelada, peça de aproximadamente 1kg",
    quantity: 15,
    expire_date: getFutureDate(3),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/707/19531707.jpg"
  },
  {
    name: "Biscoito Recheado - 140g",
    price: 2.45,
    description: "Biscoito recheado sabor chocolate",
    quantity: 65,
    expire_date: getFutureDate(7), // Validade de 7 meses
    imageUrl: "https://www.casafiesta.fot.br/produtos/grandes/biscoito-recheado-pullman-chocolate-125g.jpg"
  },
  {
    name: "Refrigerante Cola - 2L",
    price: 7.99,
    description: "Refrigerante sabor cola em garrafa PET",
    quantity: 40,
    expire_date: getFutureDate(6), // Validade de 6 meses
    imageUrl: "https://m.media-amazon.com/images/I/51MOLytD-AL._AC_UF894,1000_QL80_.jpg"
  },
  {
    name: "Papel Higiênico - 4 rolos",
    price: 5.45,
    description: "Papel higiênico folha dupla, pacote com 4 rolos",
    quantity: 30,
    expire_date: getFutureDate(60), // Validade de 60 meses (produtos não perecíveis)
    imageUrl: "https://a-static.mlcdn.com.br/800x560/papel-higienico-personal-vip-folha-dupla-4-rolos-30-metros-x-10-cm/magazineluiza/224438500/e1f477ad8de7872d8663e908681c75c2.jpg"
  },
  {
    name: "Sabonete em Barra - 90g",
    price: 1.85,
    description: "Sabonete em barra hidratante",
    quantity: 70,
    expire_date: getFutureDate(24), // Validade de 24 meses
    imageUrl: "https://www.nivea.com.br/~/images/media-center-items/9/9/e/8ec0293463d346539cc9c1a4bdb8f9bd-web_1010x1180_transparent_png.png"
  },
  {
    name: "Detergente Líquido - 500ml",
    price: 2.35,
    description: "Detergente líquido para louças",
    quantity: 45,
    expire_date: getFutureDate(36), // Validade de 36 meses
    imageUrl: "https://cdn.awsli.com.br/800x800/362/362251/produto/44899909/f13fc24178.jpg"
  },
  // Adicionando produtos de ovos que faltavam
  {
    name: "Ovos Brancos - Dúzia",
    price: 9.99,
    description: "Ovos brancos grandes, embalagem com 12 unidades",
    quantity: 40,
    expire_date: getFutureDate(1),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/393/12309393.jpg"
  },
  {
    name: "Ovos Caipira - 10 unidades",
    price: 12.50,
    description: "Ovos caipira de galinhas criadas com alimentação natural",
    quantity: 25,
    expire_date: getFutureDate(1),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/67/574067.jpg"
  },
  {
    name: "Ovos Vermelhos - Dúzia",
    price: 10.90,
    description: "Ovos vermelhos grandes, embalagem com 12 unidades",
    quantity: 30,
    expire_date: getFutureDate(1),
    imageUrl: "https://www.paodeacucar.com/img/uploads/1/429/19540429.png"
  }
];
