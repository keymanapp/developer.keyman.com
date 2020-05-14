import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new AuthGuard()).toBeDefined();
  });

  it('should activate if session has login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/foo',
      session: { login: 'foo' },
      headers: { authorization: 'foo' },
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(new AuthGuard().canActivate(context)).toBeTruthy();
  });

  it('should not activate if session has no login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/foo',
      session: { login: null },
      headers: { authorization: 'foo' },
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(() => new AuthGuard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should activate if in auth/login module and no login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/auth/login',
      session: { login: null },
      headers: {},
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(new AuthGuard().canActivate(context)).toBeTruthy();
  });

  it(
    'should activate if in auth/login module and have login', () => {
      const mockRequest = jest.fn<any, any[]>(() => ({
        url: '/api/auth/login',
        session: { login: 'foo' },
        headers: {},
      }));
      const Mock = jest.fn<ExecutionContext, any[]>(() => ({
        getType: jest.fn(),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
          getRequest: mockRequest,
          getResponse: jest.fn(),
          getNext: jest.fn(),
        })),
        switchToWs: jest.fn(),
      }));
      const context = new Mock();

      expect(new AuthGuard().canActivate(context)).toBeTruthy();
    },
  );

  it('should not activate if in auth/user module and no login', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/auth/user',
      session: { login: null },
      headers: {},
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(() => new AuthGuard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should not activate if in auth/user module and have login but not authorization', () => {
    const mockRequest = jest.fn<any, any[]>(() => ({
      url: '/api/auth/user',
      session: { login: 'foo' },
      headers: {},
    }));
    const Mock = jest.fn<ExecutionContext, any[]>(() => ({
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
        getRequest: mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      })),
      switchToWs: jest.fn(),
    }));
    const context = new Mock();

    expect(() => new AuthGuard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should activate if in auth/user module and have login and authorization', () => {
      const mockRequest = jest.fn<any, any[]>(() => ({
        url: '/api/auth/user',
        session: { login: 'foo' },
        headers: { authorization: 'foo' },
      }));
      const Mock = jest.fn<ExecutionContext, any[]>(() => ({
        getType: jest.fn(),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToHttp: jest.fn<HttpArgumentsHost, any[]>(() => ({
          getRequest: mockRequest,
          getResponse: jest.fn(),
          getNext: jest.fn(),
        })),
        switchToWs: jest.fn(),
      }));
      const context = new Mock();

      expect(new AuthGuard().canActivate(context)).toBeTruthy();
    },
  );

});
