import { StatusCodes } from 'http-status-codes';

export class HttResponse {
  private constructor(
    public statusCode: StatusCodes,
    public body?: any,
    public headers?: {
      [header: string]: string | number | boolean;
    }
  ) {}

  static ok(body: any): HttResponse {
    return this.json(body);
  }

  static created(): HttResponse {
    return this.json(null, StatusCodes.CREATED);
  }

  static notContent(): HttResponse {
    return this.json(null, StatusCodes.NO_CONTENT);
  }

  static badRequest(body: any): HttResponse {
    return this.json(body, StatusCodes.BAD_REQUEST);
  }

  static notFound(body: any): HttResponse {
    return this.json(body, StatusCodes.NOT_FOUND);
  }

  static forbidden(body: any): HttResponse {
    return this.json(body, StatusCodes.FORBIDDEN);
  }

  static unauthorize(body: any): HttResponse {
    return this.json(body, StatusCodes.UNAUTHORIZED);
  }

  private static json = (
    body: any,
    statusCode: StatusCodes = StatusCodes.OK,
    headers: Record<string, unknown> = {}
  ): HttResponse => {
    if (body === null || body === undefined) {
      return new HttResponse(statusCode);
    }

    return new HttResponse(statusCode, JSON.stringify(body), {
      'Content-Type': 'application/json',
      ...headers,
    });
  };
}
