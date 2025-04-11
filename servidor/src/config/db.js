import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: console.log, 
});

const authenticateDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o BD estabelecida.');
  } catch (error) {
    console.error('Erro ao conectar no BD:', error);
  }
};

// Chama a função de autenticação
authenticateDatabase();

export default sequelize;