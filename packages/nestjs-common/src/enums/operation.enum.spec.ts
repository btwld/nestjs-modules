import {
  MutateOperations,
  Operation,
  ReadOperations,
  WriteOperations,
} from './operation.enum';

describe('Operation constants', () => {
  it('QueryOperations should contain List and Read', () => {
    expect(ReadOperations).toContain(Operation.List);
    expect(ReadOperations).toContain(Operation.Read);
    expect(ReadOperations).toHaveLength(2);
  });

  it('WriteOperations should contain Create, CreateBatch, Update, Replace', () => {
    expect(WriteOperations).toContain(Operation.Create);
    expect(WriteOperations).toContain(Operation.CreateBatch);
    expect(WriteOperations).toContain(Operation.Update);
    expect(WriteOperations).toContain(Operation.Replace);
    expect(WriteOperations).toHaveLength(4);
  });

  it('MutateOperations should contain all write operations plus Delete, SoftDelete, and Restore', () => {
    expect(MutateOperations).toContain(Operation.Create);
    expect(MutateOperations).toContain(Operation.CreateBatch);
    expect(MutateOperations).toContain(Operation.Update);
    expect(MutateOperations).toContain(Operation.Replace);
    expect(MutateOperations).toContain(Operation.Delete);
    expect(MutateOperations).toContain(Operation.SoftDelete);
    expect(MutateOperations).toContain(Operation.Restore);
    expect(MutateOperations).toHaveLength(7);
  });
});
