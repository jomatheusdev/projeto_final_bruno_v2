import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Payment = sequelize.define('Payment', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'PENDING',
    validate: {
      isIn: [['PENDING', 'COMPLETED', 'FAILED']]
    }
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
});

export default Payment;
