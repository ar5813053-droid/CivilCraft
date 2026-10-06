/** Player economy uses same wallet/shop math as NPCs. */
function purchase(buyer, shop, goodId, qty, unitPrice) {
  const total = unitPrice * qty;
  if ((buyer.money || 0) < total) return { ok: false, error: "insufficient_funds" };
  if ((shop.inventory[goodId] || 0) < qty) return { ok: false, error: "stockout" };
  buyer.money -= total;
  shop.money = (shop.money || 0) + total;
  shop.inventory[goodId] -= qty;
  buyer.inventory = buyer.inventory || {};
  buyer.inventory[goodId] = (buyer.inventory[goodId] || 0) + qty;
  shop.revenue = (shop.revenue || 0) + total;
  return { ok: true };
}
function sell(seller, shop, goodId, qty, unitPrice) {
  if ((seller.inventory[goodId] || 0) < qty) return { ok: false, error: "insufficient_goods" };
  const total = unitPrice * qty;
  if ((shop.money || 0) < total) return { ok: false, error: "shop_cannot_pay" };
  seller.inventory[goodId] -= qty;
  shop.inventory[goodId] = (shop.inventory[goodId] || 0) + qty;
  shop.money -= total;
  seller.money = (seller.money || 0) + total;
  return { ok: true, total };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Player economy\n");
const player = { money: 50, inventory: {} };
const shop = { money: 100, inventory: { bread: 10 }, revenue: 0 };
assert(purchase(player, shop, "bread", 2, 8).ok, "shop purchase from wallet");
assert(player.money === 34 && shop.inventory.bread === 8 && shop.revenue === 16, "purchase integrity");
assert(purchase(player, { money: 0, inventory: { bread: 0 }, revenue: 0 }, "bread", 1, 8).error === "stockout", "stockout");
assert(sell(player, shop, "bread", 1, 5).ok && player.money === 39, "shop selling");
const bankPay = { money: 0, inventory: {} };
const bank = { money: 40 };
const need = 16;
if (bank.money >= need) {
  bank.money -= need;
  bankPay.money += need;
}
const shop2 = { money: 50, inventory: { bread: 5 }, revenue: 0 };
assert(purchase(bankPay, shop2, "bread", 2, 8).ok, "shop purchase from bank path");
assert(player.money + shop.money === 39 + 111, "wallet and shop balances after sell");
assert(bank.money + bankPay.money + shop2.money === 24 + 0 + 66, "bank path money conserved");
console.log(failed ? `${failed} failed` : `\nAll ${passed} player-economy tests passed.`);
process.exit(failed ? 1 : 0);
