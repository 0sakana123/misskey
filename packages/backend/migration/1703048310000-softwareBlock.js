export class softwareBlock1703048310000 {
	name = 'softwareBlock1703048310000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "blockedSoftwares" character varying(128) array NOT NULL DEFAULT '{}'::varchar[]`);
	}

	async down(queryRunner) {
			await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "blockedSoftwares"`);
	}
}
