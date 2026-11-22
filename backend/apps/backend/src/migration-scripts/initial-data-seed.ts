import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ModuleRegistrationName, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow, createProductCategoriesWorkflow, createProductOptionsWorkflow, createProductsWorkflow,
  createRegionsWorkflow, createSalesChannelsWorkflow, createShippingOptionsWorkflow, createStockLocationsWorkflow,
  createStoresWorkflow, createTaxRegionsWorkflow, linkSalesChannelsToApiKeyWorkflow, linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * CJPacific USA starter data. Runs once on the first `medusa db:migrate`.
 * Products, prices and photos are SAMPLES: replace them in Medusa Admin before launch.
 * Sample photos ship in backend/static/products and are served at <MEDUSA_BACKEND_URL>/static/products.
 * Photos uploaded in Admin replace them.
 */
const CATEGORIES = ["Seafood", "Meat", "Vegetables", "Grains", "Seasoning/Sauces", "Dry Foods", "Supplies"];
const PRODUCTS: { handle: string; title: string; category: string; price: number; pack: string; sku: string; image: string }[] = [
  {
    "handle": "salmon",
    "title": "Atlantic salmon fillets",
    "category": "Seafood",
    "price": 128.0,
    "pack": "10 lb case",
    "sku": "SF-101",
    "image": "cj-sample-salmon-v1.jpg"
  },
  {
    "handle": "shrimp",
    "title": "Peeled white shrimp",
    "category": "Seafood",
    "price": 42.0,
    "pack": "5 lb bag",
    "sku": "SF-102",
    "image": "cj-sample-shrimp-v1.jpg"
  },
  {
    "handle": "chicken",
    "title": "Boneless chicken thigh",
    "category": "Meat",
    "price": 62.0,
    "pack": "10 kg case",
    "sku": "MT-101",
    "image": "cj-sample-chicken-v1.jpg"
  },
  {
    "handle": "beef",
    "title": "Sliced beef short plate",
    "category": "Meat",
    "price": 54.5,
    "pack": "5 lb pack",
    "sku": "MT-102",
    "image": "cj-sample-beef-v1.jpg"
  },
  {
    "handle": "broccoli",
    "title": "Broccoli florets",
    "category": "Vegetables",
    "price": 19.25,
    "pack": "5 kg case",
    "sku": "VG-101",
    "image": "cj-sample-broccoli-v1.jpg"
  },
  {
    "handle": "edamame",
    "title": "Edamame in pod",
    "category": "Vegetables",
    "price": 4.8,
    "pack": "1 kg bag",
    "sku": "VG-102",
    "image": "cj-sample-edamame-v1.jpg"
  },
  {
    "handle": "rice",
    "title": "Short-grain white rice",
    "category": "Grains",
    "price": 25.9,
    "pack": "25 lb bag",
    "sku": "GR-101",
    "image": "cj-sample-rice-v1.jpg"
  },
  {
    "handle": "sesame",
    "title": "Pure sesame oil",
    "category": "Seasoning/Sauces",
    "price": 18.9,
    "pack": "56 fl oz tin",
    "sku": "SS-101",
    "image": "kadoya-sesame-oil-v1.jpg"
  },
  {
    "handle": "shiitake",
    "title": "Dried shiitake mushrooms",
    "category": "Dry Foods",
    "price": 15.9,
    "pack": "1 lb bag",
    "sku": "DF-101",
    "image": "cj-sample-shiitake-v1.jpg"
  },
  {
    "handle": "containers",
    "title": "Kraft takeout containers",
    "category": "Supplies",
    "price": 14.5,
    "pack": "50 count sleeve",
    "sku": "SP-101",
    "image": "cj-sample-containers-v1.jpg"
  }
];

const IMG = (f: string) => `${(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")}/static/products/${f}`

export default async function initial_data_seed({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillment = container.resolve(ModuleRegistrationName.FULFILLMENT);

  logger.info("Seeding CJPacific USA store...");
  const { result: [channel] } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: "CJPacific website", description: "Business ordering website" }] },
  });
  const { result: [key] } = await createApiKeysWorkflow(container).run({
    input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [channel.id] } });
  await createStoresWorkflow(container).run({
    input: { stores: [{ name: "CJPacific USA", supported_currencies: [{ currency_code: "usd", is_default: true }], default_sales_channel_id: channel.id }] },
  });

  // Invoices are emailed separately, so checkout uses Medusa's built-in manual provider: no card is collected.
  const { result: [region] } = await createRegionsWorkflow(container).run({
    input: { regions: [{ name: "United States", currency_code: "usd", countries: ["us"], payment_providers: ["pp_system_default"] }] },
  });
  await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "us", provider_id: "tp_system" }] });

  const { result: [location] } = await createStockLocationsWorkflow(container).run({
    input: { locations: [{ name: "CJPacific warehouse", address: { city: "Oakland", country_code: "US", address_1: "" } }] },
  });
  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" } });

  const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  const set = await fulfillment.createFulfillmentSets({
    name: "CJPacific local", type: "shipping",
    service_zones: [{ name: "Local area", geo_zones: [{ country_code: "us", type: "country" }] }],
  });
  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_set_id: set.id } });

  const rules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ];
  const option = (name: string, code: string, description: string) => ({
    name, price_type: "flat" as const, provider_id: "manual_manual", service_zone_id: set.service_zones[0].id,
    shipping_profile_id: profile.id, type: { label: name, description, code },
    prices: [{ currency_code: "usd", amount: 0 }, { region_id: region.id, amount: 0 }], rules,
  });
  await createShippingOptionsWorkflow(container).run({
    input: [
      option("Pickup", "pickup", "Pick up at the warehouse. We email the pickup time."),
      option("Local delivery", "local-delivery", "Delivered to your business. Delivery fees, if any, appear on the invoice."),
    ],
  });
  await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [channel.id] } });

  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: { product_categories: CATEGORIES.map((name, rank) => ({ name, is_active: true, rank })) },
  });
  const { result: [packOption] } = await createProductOptionsWorkflow(container).run({
    input: { product_options: [{ title: "Pack", values: [...new Set(PRODUCTS.map((p) => p.pack))] }] },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: PRODUCTS.map((p) => ({
        title: p.title, handle: p.handle, status: ProductStatus.PUBLISHED,
        category_ids: [categories.find((c) => c.name === p.category)!.id],
        shipping_profile_id: profile.id, thumbnail: IMG(p.image), images: [{ url: IMG(p.image) }],
        subtitle: p.pack, metadata: { sample: true },
        options: [{ id: packOption.id }],
        variants: [{
          title: p.pack, sku: p.sku, manage_inventory: false, options: { Pack: p.pack },
          prices: [{ amount: p.price, currency_code: "usd" }],
        }],
        sales_channels: [{ id: channel.id }],
      })),
    },
  });
  logger.info(`CJPacific seed done. Publishable key: ${key.token}`);
}
