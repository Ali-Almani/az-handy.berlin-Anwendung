import 'dotenv/config';
import { Sequelize } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${process.env.PG_USER || 'postgres'}:${process.env.PG_PASSWORD || 'postgres'}@${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE || 'az_handy_berlin'}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected');
    return sequelize;
  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    throw error;
  }
};

export default connectDB;
export { sequelize };
