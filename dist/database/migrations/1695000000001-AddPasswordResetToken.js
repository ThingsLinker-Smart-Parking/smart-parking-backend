"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPasswordResetToken1695000000001 = void 0;
class AddPasswordResetToken1695000000001 {
    constructor() {
        this.name = 'AddPasswordResetToken1695000000001';
    }
    async up(queryRunner) {
        // Create Password Reset Token table
        await queryRunner.query(`
            CREATE TABLE "password_reset_token" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token" character varying NOT NULL,
                "hashedToken" character varying NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "isUsed" boolean NOT NULL DEFAULT false,
                "usedAt" TIMESTAMP,
                "ipAddress" character varying,
                "userAgent" character varying,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_password_reset_token_token" UNIQUE ("token"),
                CONSTRAINT "PK_password_reset_token_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_password_reset_token_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_user_id" ON "password_reset_token" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_expires_at" ON "password_reset_token" ("expiresAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_is_used" ON "password_reset_token" ("isUsed")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_hashed_token" ON "password_reset_token" ("hashedToken")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "password_reset_token"`);
    }
}
exports.AddPasswordResetToken1695000000001 = AddPasswordResetToken1695000000001;
