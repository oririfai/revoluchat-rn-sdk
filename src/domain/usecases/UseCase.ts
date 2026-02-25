export interface UseCase<Type, Params> {
    execute(params: Params): Promise<Type> | Type;
}
