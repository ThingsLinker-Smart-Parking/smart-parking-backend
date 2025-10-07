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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Node_1 = require("./Node");
const ParkingLot_1 = require("./ParkingLot");
const Subscription_1 = require("./Subscription");
const Gateway_1 = require("./Gateway");
let User = class User {
    async hashPassword() {
        this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, 12);
    }
    async hashPasswordBeforeUpdate() {
        // Only hash if password has changed
        if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
            this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, 12);
        }
    }
    // Generate OTP (6 digits) - Legacy method, prefer using otpService
    generateOtp() {
        this.otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    }
    // Validate OTP - Legacy method, prefer using otpService
    validateOtp(otp) {
        if (!this.otp || !this.otpExpiry)
            return false;
        if (this.otpExpiry < new Date())
            return false; // OTP expired
        return this.otp === otp;
    }
    // Clear OTP after use - Legacy method, prefer using otpService
    clearOtp() {
        this.otp = null;
        this.otpExpiry = null;
    }
    async validatePassword(password) {
        return bcryptjs_1.default.compare(password, this.passwordHash);
    }
    // Get full name
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    // Check if user has specific role
    hasRole(role) {
        return this.role === role;
    }
    // Check if user is admin or super admin
    isAdmin() {
        return this.role === 'admin' || this.role === 'super_admin';
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'user' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "otp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "otpExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 15 }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 15 }),
    __metadata("design:type", String)
], User.prototype, "gstNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 100 }),
    __metadata("design:type", String)
], User.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 100 }),
    __metadata("design:type", String)
], User.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 10 }),
    __metadata("design:type", String)
], User.prototype, "zipCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 100 }),
    __metadata("design:type", String)
], User.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ParkingLot_1.ParkingLot, parkingLot => parkingLot.admin),
    __metadata("design:type", Array)
], User.prototype, "parkingLots", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Subscription_1.Subscription, subscription => subscription.admin),
    __metadata("design:type", Array)
], User.prototype, "subscriptions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Node_1.Node, node => node.admin),
    __metadata("design:type", Array)
], User.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Gateway_1.Gateway, gateway => gateway.linkedAdmin),
    __metadata("design:type", Array)
], User.prototype, "linkedGateways", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
__decorate([
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPasswordBeforeUpdate", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)()
], User);
