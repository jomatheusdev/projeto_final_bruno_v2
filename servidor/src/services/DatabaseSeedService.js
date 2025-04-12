/**
 * Serviço responsável por popular o banco de dados com dados iniciais
 */
import Product from '../models/ProductModel.js';
import { products } from '../config/seedData.js';

const DatabaseSeedService = {
  /**
   * Verifica se o banco de dados está vazio e, se estiver, o popula com dados iniciais
   */
  seedDatabase: async () => {
    try {
      console.log('Verificando necessidade de seed inicial no banco de dados...');
      
      // Verifica se já existem produtos no banco
      const productCount = await Product.count();
      
      if (productCount === 0) {
        console.log('Banco de dados vazio. Iniciando seed de dados...');
        
        // Criar produtos individualmente para evitar problemas com campo expire_date
        let successCount = 0;
        
        for (const product of products) {
          try {
            await Product.create({
              name: product.name,
              price: product.price,
              description: product.description,
              quantity: product.quantity,
              expire_date: product.expire_date || null, // Garante que não dê erro se não houver data
              imageUrl: product.imageUrl || null
            });
            successCount++;
            console.log(`Produto adicionado: ${product.name}`);
          } catch (individualError) {
            console.error(`Erro ao criar o produto "${product.name}":`, individualError.message);
          }
        }
        
        console.log(`Seed concluído! ${successCount} de ${products.length} produtos foram adicionados.`);
        
        if (successCount === 0) {
          throw new Error('Não foi possível adicionar nenhum produto.');
        }
      } else {
        console.log(`Seed não necessário. Banco já possui ${productCount} produtos.`);
      }
      
      // Tenta fazer uma consulta simples para verificar se conseguimos recuperar produtos
      const testProducts = await Product.findAll({ limit: 3 });
      console.log(`Teste de consulta: Encontrados ${testProducts.length} produtos:`);
      testProducts.forEach(p => console.log(`- ${p.name}: R$ ${p.price}`));
      
    } catch (error) {
      console.error('Erro durante o processo de seed:', error);
      throw error;
    }
  }
};

export default DatabaseSeedService;
