-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'READY', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LIMITED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SINGLE', 'COMBO');

-- CreateEnum
CREATE TYPE "ToppingKind" AS ENUM ('TOPPING', 'SAUCE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'VOUCHER');

-- CreateTable
CREATE TABLE "Users" (
    "user_id" SERIAL NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "full_name" VARCHAR(40) NOT NULL,
    "password_hash" VARCHAR(60) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allows_toppings" BOOLEAN NOT NULL,
    "allows_sauces" BOOLEAN NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Products" (
    "product_id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "description" VARCHAR(150),
    "price_agorot" INTEGER NOT NULL,
    "product_type" "ProductType" NOT NULL DEFAULT 'SINGLE',
    "accepts_voucher" BOOLEAN NOT NULL DEFAULT false,
    "stock_status" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "stock_count" INTEGER,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "Toppings" (
    "topping_id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "kind" "ToppingKind" NOT NULL,
    "extra_price_agorot" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Toppings_pkey" PRIMARY KEY ("topping_id")
);

-- CreateTable
CREATE TABLE "ProductToppings" (
    "product_id" INTEGER NOT NULL,
    "topping_id" INTEGER NOT NULL,

    CONSTRAINT "ProductToppings_pkey" PRIMARY KEY ("product_id","topping_id")
);

-- CreateTable
CREATE TABLE "ComboComponents" (
    "component_id" SERIAL NOT NULL,
    "combo_id" INTEGER NOT NULL,
    "slot_label" VARCHAR(20) NOT NULL,
    "fixed_product_id" INTEGER,
    "choice_category_id" INTEGER,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "ComboComponents_pkey" PRIMARY KEY ("component_id")
);

-- CreateTable
CREATE TABLE "KioskSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "closes_at" TIMESTAMPTZ(6),
    "max_open_orders" INTEGER NOT NULL DEFAULT 2,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "KioskSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "order_id" SERIAL NOT NULL,
    "order_code" CHAR(4) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_agorot" INTEGER NOT NULL,
    "cash_due_agorot" INTEGER NOT NULL,
    "voucher_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "OrderItems" (
    "order_item_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "parent_item_id" INTEGER,
    "product_id" INTEGER NOT NULL,
    "product_name" VARCHAR(40) NOT NULL,
    "unit_price_agorot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "payment_method" "PaymentMethod",
    "line_total_agorot" INTEGER NOT NULL,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("order_item_id")
);

-- CreateTable
CREATE TABLE "OrderItemToppings" (
    "order_item_id" INTEGER NOT NULL,
    "topping_id" INTEGER NOT NULL,
    "topping_name" VARCHAR(30) NOT NULL,
    "extra_price_agorot" INTEGER NOT NULL,

    CONSTRAINT "OrderItemToppings_pkey" PRIMARY KEY ("order_item_id","topping_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_phone_key" ON "Users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_name_key" ON "Categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Products_category_id_name_key" ON "Products"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Toppings_kind_name_key" ON "Toppings"("kind", "name");

-- CreateIndex
CREATE INDEX "ComboComponents_combo_id_idx" ON "ComboComponents"("combo_id");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_order_code_key" ON "Orders"("order_code");

-- CreateIndex
CREATE INDEX "Orders_status_created_at_idx" ON "Orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "Orders_user_id_status_idx" ON "Orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "OrderItems_order_id_idx" ON "OrderItems"("order_id");

-- CreateIndex
CREATE INDEX "OrderItems_parent_item_id_idx" ON "OrderItems"("parent_item_id");

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductToppings" ADD CONSTRAINT "ProductToppings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductToppings" ADD CONSTRAINT "ProductToppings_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "Toppings"("topping_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboComponents" ADD CONSTRAINT "ComboComponents_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "Products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboComponents" ADD CONSTRAINT "ComboComponents_fixed_product_id_fkey" FOREIGN KEY ("fixed_product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboComponents" ADD CONSTRAINT "ComboComponents_choice_category_id_fkey" FOREIGN KEY ("choice_category_id") REFERENCES "Categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "OrderItems"("order_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemToppings" ADD CONSTRAINT "OrderItemToppings_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItems"("order_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemToppings" ADD CONSTRAINT "OrderItemToppings_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "Toppings"("topping_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- 16 CHECK Constraints (Document 00 section 7.4)
-- =========================================================================

-- 1. users_phone_format
ALTER TABLE "Users" ADD CONSTRAINT users_phone_format
CHECK (phone ~ '^05[0-9]{8}$');

-- 2. users_counters_nonneg
ALTER TABLE "Users" ADD CONSTRAINT users_counters_nonneg
CHECK (token_version >= 0 AND failed_login_count >= 0);

-- 3. products_price_nonneg
ALTER TABLE "Products" ADD CONSTRAINT products_price_nonneg
CHECK (price_agorot >= 0);

-- 4. products_stock_count_nonneg
ALTER TABLE "Products" ADD CONSTRAINT products_stock_count_nonneg
CHECK (stock_count >= 0);

-- 5. products_limited_has_count
ALTER TABLE "Products" ADD CONSTRAINT products_limited_has_count
CHECK ((stock_status = 'LIMITED') = (stock_count IS NOT NULL));

-- 6. products_combo_no_voucher
ALTER TABLE "Products" ADD CONSTRAINT products_combo_no_voucher
CHECK (NOT (product_type = 'COMBO' AND accepts_voucher));

-- 7. products_combo_not_limited
ALTER TABLE "Products" ADD CONSTRAINT products_combo_not_limited
CHECK (product_type = 'SINGLE' OR stock_status <> 'LIMITED');

-- 8. toppings_extra_nonneg
ALTER TABLE "Toppings" ADD CONSTRAINT toppings_extra_nonneg
CHECK (extra_price_agorot >= 0);

-- 9. combo_component_exactly_one
ALTER TABLE "ComboComponents" ADD CONSTRAINT combo_component_exactly_one
CHECK ((fixed_product_id IS NULL) <> (choice_category_id IS NULL));

-- 10. kiosk_single_row
ALTER TABLE "KioskSettings" ADD CONSTRAINT kiosk_single_row
CHECK (id = 1);

-- 11. kiosk_max_open_orders_range
ALTER TABLE "KioskSettings" ADD CONSTRAINT kiosk_max_open_orders_range
CHECK (max_open_orders BETWEEN 1 AND 5);

-- 12. orders_amounts_nonneg
ALTER TABLE "Orders" ADD CONSTRAINT orders_amounts_nonneg
CHECK (total_agorot >= 0 AND cash_due_agorot >= 0 AND voucher_count >= 0);

-- 13. orders_closed_at_matches_status
ALTER TABLE "Orders" ADD CONSTRAINT orders_closed_at_matches_status
CHECK ((status IN ('PAID', 'CANCELED')) = (closed_at IS NOT NULL));

-- 14. order_items_amounts
ALTER TABLE "OrderItems" ADD CONSTRAINT order_items_amounts
CHECK (unit_price_agorot >= 0 AND line_total_agorot >= 0 AND quantity > 0);

-- 15. order_items_payment_on_top_level
ALTER TABLE "OrderItems" ADD CONSTRAINT order_items_payment_on_top_level
CHECK ((parent_item_id IS NULL) = (payment_method IS NOT NULL));

-- 16. order_item_toppings_extra_nonneg
ALTER TABLE "OrderItemToppings" ADD CONSTRAINT order_item_toppings_extra_nonneg
CHECK (extra_price_agorot >= 0);
