import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  price: {
    type: DataTypes.FLOAT,
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
  expire_date: {
    type: DataTypes.DATE,
    allowNull: true,  // Permitir nulo para produtos que não expiram
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
});

export default Product;

