export interface CrudRoutesOptionsInterface {
  createOne?: CrudCreateOneRouteOptionsInterface;
  updateOne?: CrudUpdateOneRouteOptionsInterface;
  replaceOne?: CrudReplaceOneRouteOptionsInterface;
  deleteOne?: CrudDeleteOneRouteOptionsInterface;
  recoverOne?: CrudRecoverOneRouteOptionsInterface;
}

export interface CrudCreateOneRouteOptionsInterface {
  returnShallow?: boolean;
}

export interface CrudReplaceOneRouteOptionsInterface {
  returnShallow?: boolean;
}

export interface CrudUpdateOneRouteOptionsInterface {
  returnShallow?: boolean;
}

export interface CrudDeleteOneRouteOptionsInterface {
  returnDeleted?: boolean;
}

export interface CrudRecoverOneRouteOptionsInterface {
  returnRecovered?: boolean;
}
