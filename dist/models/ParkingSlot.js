"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingSlot = void 0;
const typeorm_1 = require("typeorm");
const Floor_1 = require("./Floor");
const Node_1 = require("./Node");
const ParkingStatusLog_1 = require("./ParkingStatusLog");
let ParkingSlot = class ParkingSlot {
};
exports.ParkingSlot = ParkingSlot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParkingSlot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Floor_1.Floor, floor => floor.parkingSlots, { onDelete: 'CASCADE' }),
    __metadata("design:type", Floor_1.Floor)
], ParkingSlot.prototype, "floor", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParkingSlot.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ParkingSlot.prototype, "isReservable", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Node_1.Node, node => node.parkingSlot, { nullable: true }),
    __metadata("design:type", Node_1.Node)
], ParkingSlot.prototype, "node", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ParkingStatusLog_1.ParkingStatusLog, statusLog => statusLog.parkingSlot),
    __metadata("design:type", Array)
], ParkingSlot.prototype, "statusLogs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ParkingSlot.prototype, "createdAt", void 0);
exports.ParkingSlot = ParkingSlot = __decorate([
    (0, typeorm_1.Entity)()
], ParkingSlot);
