import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; // o arquivo onde você conecta no banco

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  price: {
    type: DataTypes.FLOAT, // ou DECIMAL se quiser mais precisão
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expireDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'products',        
  timestamps: true,             
  underscored: true,            
});

export default Product;

