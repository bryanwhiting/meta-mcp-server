import { describe, expect, it, vi } from "vitest";
import { MetaApiClient } from "../services/api.js";
import { fetchCatalogProducts } from "../tools/commerce.js";

describe("fetchCatalogProducts", () => {
  it("returns an empty result without calling the unsupported products edge for an empty catalog", async () => {
    const client = new MetaApiClient("test-token");
    const get = vi.spyOn(client, "get").mockResolvedValueOnce({
      id: "catalog-1",
      product_count: 0,
      vertical: "generic",
    });

    const result = await fetchCatalogProducts(client, "catalog-1", {
      fields: "id,name",
      limit: "25",
    });

    expect(result).toEqual({ data: [] });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/catalog-1", {
      fields: "id,product_count,vertical",
    });
  });

  it("uses the products edge for a non-empty catalog", async () => {
    const client = new MetaApiClient("test-token");
    const products = { data: [{ id: "product-1", name: "Test product" }] };
    const get = vi
      .spyOn(client, "get")
      .mockResolvedValueOnce({ id: "catalog-1", product_count: 1, vertical: "commerce" })
      .mockResolvedValueOnce(products);

    const params = { fields: "id,name", limit: "25" };
    const result = await fetchCatalogProducts(client, "catalog-1", params);

    expect(result).toEqual(products);
    expect(get).toHaveBeenNthCalledWith(2, "/catalog-1/products", params);
  });

  it("uses the products edge when Meta omits product_count", async () => {
    const client = new MetaApiClient("test-token");
    const products = { data: [] };
    const get = vi
      .spyOn(client, "get")
      .mockResolvedValueOnce({ id: "catalog-1", vertical: "commerce" })
      .mockResolvedValueOnce(products);

    const result = await fetchCatalogProducts(client, "catalog-1", {
      fields: "id",
      limit: "10",
    });

    expect(result).toEqual(products);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
