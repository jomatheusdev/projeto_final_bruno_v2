import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Nome é obrigatório' },
      len: {
        args: [2, 100],
        msg: 'Nome deve ter entre 2 e 100 caracteres'
      }
    }
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: {
      msg: 'Este email já está em uso'
    },
    validate: {
      isEmail: { msg: 'Email inválido' }
    }
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Senha é obrigatória' },

    }
  },

  cpf: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'CPF já cadastrado'
    },
    validate: {
      len: {
        args: [11, 14],
        msg: 'CPF deve ter entre 11 e 14 caracteres'
      }
    }
  },

  role: {
    type: DataTypes.STRING,
    defaultValue: 'CLIENT',
    validate: {
      isIn: {
        args: [['CLIENT', 'ADMIN']],
        msg: 'Role deve ser CLIENT ou ADMIN'
      }
    }
  }

}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,

  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
}
);


export default User;
