CREATE TABLE "subscriptions" (
  "user_id" TEXT NOT NULL,
  "paddle_customer_id" TEXT,
  "paddle_subscription_id" TEXT,
  "status" TEXT NOT NULL,
  "plan_price_id" TEXT,
  "current_period_end" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "subscriptions_paddle_customer_id_key" ON "subscriptions"("paddle_customer_id");
CREATE UNIQUE INDEX "subscriptions_paddle_subscription_id_key" ON "subscriptions"("paddle_subscription_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
