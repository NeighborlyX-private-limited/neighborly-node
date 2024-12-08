const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Transaction = sequelize.define(
  "transactions",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "userId",
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "orderId",
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "paymentId",
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "created",
      validate: {
        isIn: [["created", "successful", "failed"]],
      },
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "details",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "createdAt",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updatedAt",
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
  }
);

module.exports = {
  Transaction,
};
