import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';
import { User } from '../entities/User';

interface GetContactsParams {
    config: TenantConfig;
}

export class GetContactsUseCase implements UseCase<Promise<User[]>, GetContactsParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ config }: GetContactsParams): Promise<User[]> {
        const contacts = await this.chatRepository.getContacts(config);
        return contacts;
    }
}
