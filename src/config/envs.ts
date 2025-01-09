export const envs = {
  tables: {
    recipesTableName: process.env.RECIPES_TABLE_NAME || '',
    ordersTableName: process.env.ORDERS_TABLE_NAME || '',
    purchasesTableName: process.env.PURCHASES_TABLE_NAME || '',
    ingredientsTableName: process.env.INGREDIENTS_TABLE_NAME || '',
  },
  queues: {
    processOrdersQueueUrl: process.env.PROCESS_ORDERS_QUEUE_URL || '',
    purchaseIngredientsQueueUrl:
      process.env.PURCHASE_INGREDIENTS_QUEUE_URL || '',
    replenishIngredientsStockQueueUrl:
      process.env.REPLENISH_INGREDIENTS_STOCK_QUEUE_URL || '',
    updateOrderStatusQueueUrl: process.env.UPDATE_ORDERS_STATUS_QUEUE_URL || '',
    getIngredientsQueueUrl: process.env.GET_INGREDIENTS_QUEUE_URL,
  },
};
