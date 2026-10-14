import assert from "node:assert/strict";
import { test } from "node:test";
import { isOpenApi, openApiToCollection, parseApiDocument } from "./openapi";

const yaml = `
openapi: 3.0.3
info:
  title: Pet Store
  description: Pets for sale.
servers:
  - url: https://api.pets.test/v1
paths:
  /pets:
    get:
      tags: [pets]
      summary: List pets
      parameters:
        - name: limit
          in: query
          schema: { type: integer, example: 20 }
      responses:
        "200":
          description: A list
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Pet" }
    post:
      tags: [pets]
      summary: Create a pet
      requestBody:
        content:
          application/json:
            schema: { $ref: "#/components/schemas/Pet" }
      responses:
        "201": { description: Created }
  /pets/{petId}:
    parameters:
      - name: petId
        in: path
        required: true
        schema: { type: string, example: "42" }
    get:
      summary: Get a pet
      parameters:
        - name: X-Request-Id
          in: header
          schema: { type: string, format: uuid }
      responses:
        "404": { description: Not found }
components:
  schemas:
    Pet:
      type: object
      properties:
        id: { type: integer }
        name: { type: string, example: Rex }
        born: { type: string, format: date }
`;

test("converts paths, tags, parameters, bodies and responses", () => {
  const spec = parseApiDocument(yaml);
  assert.ok(isOpenApi(spec));
  const collection = openApiToCollection(spec) as any;

  assert.equal(collection.info.name, "Pet Store");
  assert.deepEqual(collection.variable, [{ key: "baseUrl", value: "https://api.pets.test/v1" }]);

  const [pets, getPet] = collection.item;
  assert.equal(pets.name, "pets");
  const [list, create] = pets.item;
  assert.equal(list.request.url.raw, "{{baseUrl}}/pets?limit=20");
  assert.deepEqual(JSON.parse(list.response[0].body), [{ id: 0, name: "Rex", born: "2026-01-01" }]);
  assert.deepEqual(JSON.parse(create.request.body.raw), { id: 0, name: "Rex", born: "2026-01-01" });
  assert.equal(create.request.header.find((h: any) => h.key === "Content-Type").value, "application/json");

  assert.equal(getPet.name, "Get a pet");
  assert.equal(getPet.request.url.raw, "{{baseUrl}}/pets/:petId");
  assert.deepEqual(getPet.request.url.variable.map((v: any) => [v.key, v.value]), [["petId", "42"]]);
  assert.equal(getPet.request.header[0].key, "X-Request-Id");
  assert.equal(getPet.response[0].code, 404);
});

test("rejects documents that are not OpenAPI", () => {
  assert.equal(isOpenApi({ info: { name: "x" }, item: [] }), false);
});
