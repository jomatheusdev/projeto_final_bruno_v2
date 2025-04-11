import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import userRouter from './routers/UserRouters.js';
import productRouter from './routers/ProductRouters.js';
import sequelize from './config/db.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', userRouter);
app.use('/api', productRouter);

sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado com Sequelize');
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao sincronizar com o banco de dados:', error);
  });
