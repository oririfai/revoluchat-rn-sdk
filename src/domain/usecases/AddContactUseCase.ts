import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';

export class AddContactUseCase {
    constructor(private repository: ChatRepository) { }

    async execute(params: {
        config: TenantConfig;
        phone: string;
    }): Promise<any> {
        return this.repository.addContact(params.config, params.phone);
    }
}
